import { prisma } from '@/lib/db';
import { crawlUrl, hashItems } from './scraper';
import { processDiscoveries } from './discovery';
import { SourceType } from '@prisma/client';
import { crawlState } from './crawlState';

// ─── Internal result types ────────────────────────────────────────────────────

type SourceResult = {
  itemsFound: number;
  newCount: number;
  duplicateCount: number;
  failed: boolean;
};

type BrandResult = {
  sourcesProcessed: number;
  itemsFound: number;
  newCount: number;
  duplicateCount: number;
  failedSources: number;
};

// ─── crawlBrand ───────────────────────────────────────────────────────────────

export async function crawlBrand(brandId: string, force = false): Promise<BrandResult> {
  const result: BrandResult = {
    sourcesProcessed: 0,
    itemsFound: 0,
    newCount: 0,
    duplicateCount: 0,
    failedSources: 0,
  };

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { sources: { where: { isActive: true } } },
  });

  if (!brand || !brand.isActive) return result;

  console.log(`[Crawler] Brand: ${brand.name}`);
  crawlState.setBrand(brand.name);

  for (const source of brand.sources) {
    if (
      source.sourceType === SourceType.INSTAGRAM ||
      source.sourceType === SourceType.WEB_SEARCH
    ) {
      continue;
    }

    // Frequency gate — bypassed entirely when force=true
    if (!force && source.lastCrawled) {
      const minutesSince = (Date.now() - source.lastCrawled.getTime()) / 60000;
      if (minutesSince < source.crawlFreq) {
        console.log(
          `[Crawler] Source: ${source.sourceType} | Skipping: true` +
          ` (crawled ${Math.round(minutesSince)}m ago, freq=${source.crawlFreq}m)`
        );
        continue;
      }
    }

    console.log(
      `[Crawler] Source: ${source.sourceType}` +
      ` | URL: ${source.url}` +
      ` | Skipping: false`
    );

    const sr = await crawlSource(brandId, source.id, source.url, source.sourceType, source.lastHash);

    result.sourcesProcessed += 1;
    result.itemsFound      += sr.itemsFound;
    result.newCount        += sr.newCount;
    result.duplicateCount  += sr.duplicateCount;
    if (sr.failed) result.failedSources += 1;

    crawlState.recordSource(sr.itemsFound, sr.newCount, sr.duplicateCount, sr.failed);
  }

  await prisma.brand.update({
    where: { id: brandId },
    data: { lastCrawledAt: new Date() },
  });

  console.log(
    `[Crawler] Brand complete: ${brand.name}` +
    ` | sources=${result.sourcesProcessed}` +
    ` | found=${result.itemsFound}` +
    ` | new=${result.newCount}` +
    ` | dupes=${result.duplicateCount}`
  );

  crawlState.completeBrand();
  return result;
}

// ─── crawlSource ──────────────────────────────────────────────────────────────

export async function crawlSource(
  brandId: string,
  sourceId: string,
  url: string,
  sourceType: SourceType,
  lastHash?: string | null
): Promise<SourceResult> {
  const sr: SourceResult = { itemsFound: 0, newCount: 0, duplicateCount: 0, failed: false };

  const job = await prisma.crawlJob.create({
    data: {
      brandId,
      jobType: 'WEBSITE_CRAWL',
      status: 'RUNNING',
      sourceUrl: url,
      startedAt: new Date(),
    },
  });

  const log = async (level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: any) => {
    await prisma.crawlLog.create({
      data: { jobId: job.id, level, message, metadata },
    });
  };

  try {
    console.log(`[Crawler] Starting crawl: ${url}`);
    await log('INFO', `Starting crawl: ${url}`);

    const result = await crawlUrl(url);

    if (!result.success) {
      throw new Error(result.error || 'Crawl failed');
    }

    sr.itemsFound = result.items.length;
    console.log(`[Crawler] Found: ${sr.itemsFound} items`);
    await log('INFO', `Found ${sr.itemsFound} items`);

    // Skip processing if content is unchanged
    const newHash = hashItems(result.items);
    if (lastHash && lastHash === newHash && result.items.length > 0) {
      console.log(`[Crawler] No changes detected for ${url} — skipping processing`);
      await log('INFO', 'No changes detected, skipping processing');
      await prisma.brandSource.update({
        where: { id: sourceId },
        data: { lastCrawled: new Date(), errorCount: 0 },
      });
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsFound: sr.itemsFound,
          itemsNew: 0,
          metadata: { noChanges: true } as any,
        },
      });
      return sr;
    }

    const { newCount, duplicateCount } = await processDiscoveries(brandId, result.items, sourceType);
    sr.newCount       = newCount;
    sr.duplicateCount = duplicateCount;

    console.log(`[Crawler] New: ${newCount} | Duplicates: ${duplicateCount}`);
    await log('INFO', `Processing complete: ${newCount} new, ${duplicateCount} duplicates`);

    await prisma.brandSource.update({
      where: { id: sourceId },
      data: { lastCrawled: new Date(), lastHash: newHash, errorCount: 0 },
    });

    await prisma.crawlJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        itemsFound: sr.itemsFound,
        itemsNew: newCount,
      },
    });
  } catch (error: any) {
    sr.failed = true;

    console.error(`[Crawler] Error crawling ${url}: ${error.message}`);
    await log('ERROR', `Crawl error: ${error.message}`);

    await prisma.brandSource.update({
      where: { id: sourceId },
      data: { errorCount: { increment: 1 } },
    });

    await prisma.crawlJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', completedAt: new Date(), error: error.message },
    });

    await prisma.systemEvent.create({
      data: {
        type: 'CRAWLER_ERROR',
        level: 'ERROR',
        message: `Crawl failed for ${url}: ${error.message}`,
        metadata: { brandId, sourceId, url } as any,
      },
    });
  }

  return sr;
}

// ─── crawlAllActiveBrands ─────────────────────────────────────────────────────

export async function crawlAllActiveBrands(force = false): Promise<void> {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'asc' }, { lastCrawledAt: 'asc' }],
  });

  console.log(`[Crawler] Force mode: ${force}`);
  console.log(`[Crawler] Brands to process: ${brands.length}`);

  if (!crawlState.tryAcquire(brands.length, force)) {
    console.warn('[Crawler] Crawl already in progress — aborting duplicate run');
    return;
  }

  const totals = {
    brandsProcessed: 0,
    sourcesProcessed: 0,
    itemsFound: 0,
    newItems: 0,
    duplicates: 0,
    failedSources: 0,
  };

  await prisma.systemEvent.create({
    data: {
      type: 'CRAWLER_START',
      level: 'INFO',
      message: `Starting crawl cycle for ${brands.length} brands (force=${force})`,
      metadata: { brandCount: brands.length, force } as any,
    },
  });

  try {
    for (const brand of brands) {
      try {
        const br = await crawlBrand(brand.id, force);
        totals.brandsProcessed += 1;
        totals.sourcesProcessed += br.sourcesProcessed;
        totals.itemsFound       += br.itemsFound;
        totals.newItems         += br.newCount;
        totals.duplicates       += br.duplicateCount;
        totals.failedSources    += br.failedSources;
      } catch (error: any) {
        console.error(`[Crawler] Unhandled error for brand ${brand.name}:`, error.message);
        totals.brandsProcessed += 1;
      }
    }
  } finally {
    // Always release the lock — even if a brand throws unexpectedly
    crawlState.release();
  }

  console.log(
    `[Crawler] Cycle complete` +
    ` | brands=${totals.brandsProcessed}` +
    ` | sources=${totals.sourcesProcessed}` +
    ` | found=${totals.itemsFound}` +
    ` | new=${totals.newItems}` +
    ` | dupes=${totals.duplicates}` +
    ` | failed=${totals.failedSources}` +
    ` | force=${force}`
  );

  await prisma.systemEvent.create({
    data: {
      type: 'CRAWLER_COMPLETE',
      level: 'INFO',
      message:
        `Crawl cycle complete: ${totals.newItems} new items across ${totals.brandsProcessed} brands`,
      metadata: { ...totals, force } as any,
    },
  });
}
