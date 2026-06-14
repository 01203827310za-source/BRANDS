import { NextRequest, NextResponse } from 'next/server';
import { repairCrawlerState } from '@/services/crawler/repair';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/debug/repair-crawler
 *
 * Runs repairCrawlerState() — clears stale lastHash values on BrandSources
 * whose brand has no products and no discoveries in the DB.
 *
 * Call this whenever you see "No changes detected, skipping processing" in
 * the logs but the DB shows 0 products / 0 discoveries.
 *
 * GET /api/debug/repair-crawler
 *
 * Dry-run: reports which sources are in the stuck state without clearing
 * anything. Useful for diagnosing before committing to the repair.
 */

export async function GET(_req: NextRequest) {
  // Dry-run: show what would be cleared without actually changing anything
  const sources = await prisma.brandSource.findMany({
    where: { lastHash: { not: null }, isActive: true },
    include: { brand: { select: { id: true, name: true } } },
  });

  const report = await Promise.all(
    sources.map(async (source) => {
      const [existingProducts, existingDiscoveries] = await Promise.all([
        prisma.product.count({ where: { brandId: source.brandId } }),
        prisma.discovery.count({ where: { brandId: source.brandId } }),
      ]);
      return {
        brandId:            source.brandId,
        brandName:          source.brand.name,
        sourceId:           source.id,
        sourceUrl:          source.url,
        lastHash:           source.lastHash ? `${source.lastHash.substring(0, 12)}…` : null,
        lastCrawled:        source.lastCrawled,
        existingProducts,
        existingDiscoveries,
        wouldClear:         existingProducts === 0 && existingDiscoveries === 0,
      };
    })
  );

  const stuckCount = report.filter((r) => r.wouldClear).length;

  return NextResponse.json({
    dryRun: true,
    sourcesWithHash: sources.length,
    stuckSources:    stuckCount,
    hint: stuckCount > 0
      ? `${stuckCount} source(s) are stuck. POST this endpoint to repair.`
      : 'No stuck sources found — crawler state is healthy.',
    sources: report,
  });
}

export async function POST(_req: NextRequest) {
  const result = await repairCrawlerState();

  return NextResponse.json({
    repaired:           result.staleHashesCleared > 0,
    sourcesInspected:   result.sourcesInspected,
    staleHashesCleared: result.staleHashesCleared,
    hint: result.staleHashesCleared > 0
      ? `Repair complete. Run POST /api/crawl with { "type": "crawl" } to repopulate the database.`
      : 'Nothing to repair — no stuck sources found.',
    details: result.details,
  });
}
