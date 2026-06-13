import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeWithAI, saveAiAnalysis } from '@/services/ai/analyzer';
import { notifyDiscovery } from '@/services/telegram/notifier';
import { getSettings } from '@/services/settings';
import { DiscoveryType } from '@prisma/client';

/**
 * POST /api/debug/reanalyze
 *
 * Re-runs AI classification on all discoveries whose AI analysis summary
 * is still "Auto-classified (AI not configured)" (i.e. Gemini/OpenAI was
 * unavailable when they were first processed).
 *
 * Optional body:
 *   { limit: number }   — max discoveries to reanalyze in one call (default: 50)
 *   { discoveryId: string } — reanalyze a single specific discovery
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { /* use defaults */ }

  const settings = await getSettings();
  const confidenceThreshold = parseFloat(settings.AI_CONFIDENCE_THRESHOLD || '0.6');
  const importanceThreshold = parseFloat(settings.IMPORTANCE_THRESHOLD || '0.5');
  const notifyTypes = (settings.NOTIFICATION_TYPES || 'NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP,RESTOCK').split(',');

  // Build the query
  const where: any = {
    aiAnalysis: {
      summary: 'Auto-classified (AI not configured)',
    },
  };

  if (body.discoveryId) {
    (where as any).id = body.discoveryId;
    delete where.aiAnalysis;
  }

  const limit = Math.min(parseInt(body.limit ?? '50'), 200);

  const discoveries = await prisma.discovery.findMany({
    where,
    include: {
      brand: true,
      product: true,
      aiAnalysis: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  console.log('[REANALYZE] found', discoveries.length, 'discoveries to reanalyze');

  let reanalyzed = 0;
  let failed = 0;
  let notified = 0;
  const errors: { id: string; title: string; error: string }[] = [];

  for (const discovery of discoveries) {
    try {
      const analysis = await analyzeWithAI({
        title: discovery.title,
        description: discovery.product?.description ?? undefined,
        brandName: discovery.brand.name,
        url: discovery.url || undefined,
        sourceType: discovery.sourceType,
      });

      if (!analysis) {
        failed++;
        errors.push({ id: discovery.id, title: discovery.title, error: 'analyzeWithAI returned null' });
        continue;
      }

      if (analysis.summary === 'Auto-classified (AI not configured)') {
        // AI still not configured — stop early
        failed++;
        errors.push({ id: discovery.id, title: discovery.title, error: 'AI still not configured' });
        continue;
      }

      await saveAiAnalysis(discovery.id, analysis, analysis.model);

      await prisma.discovery.update({
        where: { id: discovery.id },
        data: {
          discoveryType: analysis.classifiedAs as DiscoveryType,
          summary: analysis.summary,
          confidenceScore: analysis.confidence,
          importanceScore: analysis.importanceScore,
        },
      });

      // Notify if now meets threshold and wasn't already notified
      const shouldNotify =
        !discovery.isNotified &&
        analysis.shouldNotify &&
        analysis.confidence >= confidenceThreshold &&
        analysis.importanceScore >= importanceThreshold &&
        notifyTypes.includes(analysis.classifiedAs);

      if (shouldNotify) {
        await notifyDiscovery(discovery.id);
        notified++;
      }

      reanalyzed++;
      console.log('[REANALYZE]', discovery.id, '→', analysis.classifiedAs, 'conf:', analysis.confidence);
    } catch (error: any) {
      failed++;
      errors.push({ id: discovery.id, title: discovery.title, error: error.message });
      console.error('[REANALYZE] error for', discovery.id, ':', error.message);
    }
  }

  return NextResponse.json({
    total: discoveries.length,
    reanalyzed,
    notified,
    failed,
    errors: errors.slice(0, 20),
  });
}
