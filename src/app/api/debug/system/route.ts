import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/services/settings';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/system
 *
 * Full system health snapshot. Shows exactly which keys are configured,
 * what the DB settings contain, and current pipeline stats.
 */
export async function GET(_req: NextRequest) {
  const settings = await getSettings();

  const groqKey   = settings.GROQ_API_KEY  || '';
  const openaiKey = settings.OPENAI_API_KEY || '';
  const configuredProvider = settings.AI_PROVIDER || '';

  // Mirror the provider-selection logic in analyzer.ts
  let resolvedProvider: string;
  if      (configuredProvider === 'groq'   && groqKey)   resolvedProvider = 'groq';
  else if (configuredProvider === 'openai' && openaiKey) resolvedProvider = 'openai';
  else if (groqKey)                                      resolvedProvider = 'groq (auto-detected)';
  else if (openaiKey)                                    resolvedProvider = 'openai (auto-detected)';
  else                                                   resolvedProvider = 'none — will use keyword fallback';

  const [
    discoveriesCount,
    aiAnalysisCount,
    aiClassifiedCount,
    autoClassifiedCount,
    notificationsSent,
    notificationsFailed,
    pendingNotifications,
    recentAutoClassified,
  ] = await Promise.all([
    prisma.discovery.count(),
    prisma.aiAnalysis.count(),
    prisma.aiAnalysis.count({
      where: { NOT: { summary: 'Auto-classified (AI not configured)' } },
    }),
    prisma.aiAnalysis.count({
      where: { summary: 'Auto-classified (AI not configured)' },
    }),
    prisma.notification.count({ where: { status: 'SENT' } }),
    prisma.notification.count({ where: { status: 'FAILED' } }),
    prisma.notification.count({ where: { status: 'PENDING' } }),
    prisma.discovery.findMany({
      where: {
        aiAnalysis: { summary: 'Auto-classified (AI not configured)' },
      },
      include: { aiAnalysis: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const aiClassifiedRatio = aiAnalysisCount > 0
    ? `${Math.round((aiClassifiedCount / aiAnalysisCount) * 100)}%`
    : 'N/A';

  return NextResponse.json({
    aiProvider: resolvedProvider,
    aiProviderDbValue: configuredProvider || '(not set)',
    groqConfigured:  !!groqKey,
    groqKeyLength:   groqKey.length,
    openaiConfigured: !!openaiKey,
    openaiKeyLength:  openaiKey.length,
    telegramConfigured: !!(settings.TELEGRAM_BOT_TOKEN) && !!(settings.TELEGRAM_CHAT_ID),
    telegramBotSet:  !!(settings.TELEGRAM_BOT_TOKEN),
    telegramChatSet: !!(settings.TELEGRAM_CHAT_ID),
    pipeline: {
      discoveriesCount,
      aiAnalysisCount,
      aiClassifiedCount,
      autoClassifiedCount,
      aiClassifiedRatio,
    },
    notifications: {
      sent:    notificationsSent,
      failed:  notificationsFailed,
      pending: pendingNotifications,
    },
    thresholds: {
      confidence:  settings.AI_CONFIDENCE_THRESHOLD || '0.6 (default)',
      importance:  settings.IMPORTANCE_THRESHOLD    || '0.5 (default)',
      notifyTypes: settings.NOTIFICATION_TYPES      || 'NEW_PRODUCT,NEW_COLLECTION,LIMITED_DROP,RESTOCK (default)',
    },
    recentAutoClassified: recentAutoClassified.map(d => ({
      id:        d.id,
      title:     d.title,
      type:      d.discoveryType,
      model:     d.aiAnalysis?.model,
      createdAt: d.createdAt,
    })),
    hint: autoClassifiedCount > 0
      ? `${autoClassifiedCount} discoveries were keyword-classified (AI not configured). ` +
        'POST /api/debug/reanalyze to re-process them once the Groq key is confirmed working.'
      : 'All discoveries were classified by AI.',
  });
}
