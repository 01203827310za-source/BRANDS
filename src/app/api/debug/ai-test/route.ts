import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSettings } from '@/services/settings';
import { analyzeWithAI } from '@/services/ai/analyzer';
import { prisma } from '@/lib/db';

/**
 * POST /api/debug/ai-test
 *
 * Sends a sample item through the complete AI pipeline.
 * For Groq it calls the API directly so the raw response and any parse
 * errors are visible — not hidden behind the pipeline's try/catch wrapper.
 *
 * Body (all optional — defaults to a Nike Air Jordan test case):
 *   { brandName?, title?, description? }
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { /* use defaults */ }

  const brandName   = body.brandName   ?? 'Nike';
  const title       = body.title       ?? 'Air Jordan 1 Retro High OG';
  const description = body.description ?? 'New arrival available now';

  const settings = await getSettings();
  const groqKey   = settings.GROQ_API_KEY  || '';
  const openaiKey = settings.OPENAI_API_KEY || '';
  const configuredProvider = settings.AI_PROVIDER || '';

  // Mirror provider-selection from analyzer.ts
  let resolvedProvider: string;
  if      (configuredProvider === 'groq'   && groqKey)   resolvedProvider = 'groq';
  else if (configuredProvider === 'openai' && openaiKey) resolvedProvider = 'openai';
  else if (groqKey)                                      resolvedProvider = 'groq (auto-detected)';
  else if (openaiKey)                                    resolvedProvider = 'openai (auto-detected)';
  else                                                   resolvedProvider = 'none';

  const apiKeyLoaded = resolvedProvider.startsWith('groq')   ? !!groqKey
                     : resolvedProvider.startsWith('openai') ? !!openaiKey
                     : false;

  const userMessage = [
    `Brand: ${brandName}`,
    `Source Type: WEBSITE`,
    `Title/Name: ${title}`,
    `Description: ${description}`,
    '',
    'Analyze this and classify it.',
  ].join('\n');

  // ── Groq: call directly so nothing is swallowed ─────────────────────────────
  let rawGroqResponse: any          = null;
  let rawGroqText: string | null    = null;
  let parseError: string | null     = null;
  let parsedResponse: any           = null;
  let pipelineError: string | null  = null;
  let stack: string | null          = null;
  let success = false;

  if (resolvedProvider.startsWith('groq')) {
    try {
      const client = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a brand intelligence analyst. Respond only with valid JSON.' },
          { role: 'user',   content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      rawGroqText = response.choices[0]?.message?.content ?? null;
      rawGroqResponse = {
        model:        response.model,
        finishReason: response.choices[0]?.finish_reason,
        usage:        response.usage,
      };

      if (rawGroqText) {
        try {
          parsedResponse = JSON.parse(rawGroqText);
          success = true;
        } catch (e: any) {
          parseError = e.message;
        }
      }
    } catch (err: any) {
      pipelineError = err.message;
      stack = err.stack ?? null;
    }
  } else {
    // OpenAI / none — use the normal pipeline
    try {
      parsedResponse = await analyzeWithAI({ title, description, brandName, sourceType: 'WEBSITE' });
      success = !!parsedResponse && parsedResponse.summary !== 'Auto-classified (AI not configured)';
    } catch (err: any) {
      pipelineError = err.message;
      stack = err.stack ?? null;
    }
  }

  // Latest discovery from DB for before/after comparison
  const latestDiscovery = await prisma.discovery.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { aiAnalysis: true },
    take: 1,
  });

  return NextResponse.json({
    provider:         resolvedProvider,
    groqConfigured:   !!groqKey,
    openAiConfigured: !!openaiKey,
    apiKeyLoaded,
    input: { brandName, title, description },
    // ── Groq-specific diagnostics ──
    rawGroqResponse,
    rawGroqText,
    parseError,
    // ── Pipeline result ──
    parsedResponse,
    pipelineError,
    stack,
    success,
    // ── Settings snapshot ──
    settingsSnapshot: {
      AI_PROVIDER_db:          configuredProvider || '(not set)',
      GROQ_KEY_SET:            !!groqKey,
      GROQ_KEY_LEN:            groqKey.length,
      OPENAI_KEY_SET:          !!openaiKey,
      OPENAI_KEY_LEN:          openaiKey.length,
      AI_CONFIDENCE_THRESHOLD: settings.AI_CONFIDENCE_THRESHOLD || '0.6 (default)',
      IMPORTANCE_THRESHOLD:    settings.IMPORTANCE_THRESHOLD    || '0.5 (default)',
      NOTIFICATION_TYPES:      settings.NOTIFICATION_TYPES      || 'default',
    },
    latestDiscovery: latestDiscovery ? {
      id:         latestDiscovery.id,
      title:      latestDiscovery.title,
      type:       latestDiscovery.discoveryType,
      confidence: latestDiscovery.confidenceScore,
      aiSummary:  latestDiscovery.aiAnalysis?.summary,
      aiModel:    latestDiscovery.aiAnalysis?.model,
      createdAt:  latestDiscovery.createdAt,
    } : null,
  });
}
