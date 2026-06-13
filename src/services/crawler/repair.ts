import { prisma } from '@/lib/db';

export type RepairResult = {
  sourcesInspected: number;
  staleHashesCleared: number;
  details: {
    brandId: string;
    brandName: string;
    sourceId: string;
    sourceUrl: string;
    existingProducts: number;
    existingDiscoveries: number;
    hadHash: boolean;
    cleared: boolean;
  }[];
};

/**
 * repairCrawlerState
 *
 * Finds every BrandSource that has a stored hash but whose brand has zero
 * products AND zero discoveries in the database — the "stuck" state caused by
 * manual data deletion after a successful crawl.
 *
 * For each such source:
 *   - Clears lastHash (and optionally lastCrawled) so the next crawl is forced
 *     to re-process all items instead of silently skipping them.
 *
 * Safe to run at any time; it never deletes product/discovery data.
 */
export async function repairCrawlerState(): Promise<RepairResult> {
  const result: RepairResult = {
    sourcesInspected: 0,
    staleHashesCleared: 0,
    details: [],
  };

  // Load every source that has a hash, along with its brand
  const sources = await prisma.brandSource.findMany({
    where: {
      lastHash: { not: null },
      isActive: true,
    },
    include: {
      brand: {
        select: { id: true, name: true },
      },
    },
  });

  result.sourcesInspected = sources.length;

  for (const source of sources) {
    const [existingProducts, existingDiscoveries] = await Promise.all([
      prisma.product.count({ where: { brandId: source.brandId } }),
      prisma.discovery.count({ where: { brandId: source.brandId } }),
    ]);

    const isStale = existingProducts === 0 && existingDiscoveries === 0;

    const entry = {
      brandId:              source.brandId,
      brandName:            source.brand.name,
      sourceId:             source.id,
      sourceUrl:            source.url,
      existingProducts,
      existingDiscoveries,
      hadHash:              !!source.lastHash,
      cleared:              false,
    };

    if (isStale) {
      await prisma.brandSource.update({
        where: { id: source.id },
        data: {
          lastHash:    null,
          // Reset lastCrawled so the frequency gate does not skip it either
          lastCrawled: null,
        },
      });
      entry.cleared = true;
      result.staleHashesCleared += 1;

      console.log(
        `[Repair] Cleared stale hash for source ${source.id}` +
        ` (brand: ${source.brand.name}, url: ${source.url})`
      );
    }

    result.details.push(entry);
  }

  if (result.staleHashesCleared > 0) {
    await prisma.systemEvent.create({
      data: {
        type: 'SYSTEM_START',
        level: 'WARN',
        message:
          `repairCrawlerState cleared ${result.staleHashesCleared} stale hashes` +
          ` out of ${result.sourcesInspected} sources inspected`,
        metadata: {
          sourcesInspected:   result.sourcesInspected,
          staleHashesCleared: result.staleHashesCleared,
        } as any,
      },
    });
  }

  console.log(
    `[Repair] Done — inspected=${result.sourcesInspected}` +
    ` staleCleared=${result.staleHashesCleared}`
  );

  return result;
}
