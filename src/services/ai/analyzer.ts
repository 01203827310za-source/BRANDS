import OpenAI from 'openai';
import { getSettings } from '@/services/settings';
import { AIAnalysisResult } from '@/types';
import { prisma } from '@/lib/db';

const ANALYSIS_PROMPT = `You are an expert fashion and sportswear brand intelligence analyst.
Analyze the provided content from brand monitoring and classify it.

Respond ONLY with a valid JSON object with this exact structure:
{
  "classifiedAs": "NEW_PRODUCT" | "NEW_COLLECTION" | "LIMITED_DROP" | "RESTOCK" | "PROMOTION" | "ADVERTISEMENT" | "NEWS" | "OTHER",
  "summary": "Brief 1-2 sentence description of what was found",
  "reasoning": "Why you classified it this way",
  "confidence": 0.0 to 1.0,
  "importanceScore": 0.0 to 1.0,
  "keywords": ["keyword1", "keyword2"],
  "productName": "Product name if applicable or null",
  "collectionName": "Collection name if applicable or null",
  "shouldNotify": true or false
}

Classification guide:
- NEW_PRODUCT: A brand new product just released/launched (importance: 0.7-1.0)
- NEW_COLLECTION: A new seasonal or special collection (importance: 0.8-1.0)
- LIMITED_DROP: Limited edition, collab, exclusive release (importance: 0.9-1.0)
- RESTOCK: Previously sold-out item back in stock (importance: 0.6-0.8)
- PROMOTION: Sale, discount, promotional offer (importance: 0.3-0.5)
- ADVERTISEMENT: Generic marketing content (importance: 0.1-0.3)
- NEWS: Brand news, partnerships, announcements (importance: 0.5-0.8)
- OTHER: Anything else (importance: 0.1-0.3)

Set shouldNotify to true if: NEW_PRODUCT, NEW_COLLECTION, LIMITED_DROP, RESTOCK with importance >= 0.5`;

// ─── Groq model priority list ──────────────────────────────────────────────────
// Tried in order. A 404 moves to the next. Any other error triggers fallback.
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
] as const;

// ─── Main public entry point ──────────────────────────────────────────────────

export async function analyzeWithAI(content: {
  title: string;
  description?: string;
  brandName: string;
  url?: string;
  imageCount?: number;
  sourceType: string;
  additionalContext?: string;
}): Promise<AIAnalysisResult | null> {
  console.log('[AI] analyzeWithAI called | title:', content.title, '| brand:', content.brandName);

  try {
    const settings = await getSettings();

    const groqKey   = settings.GROQ_API_KEY  || '';
    const openaiKey = settings.OPENAI_API_KEY || '';
    const configuredProvider = settings.AI_PROVIDER || '';

    console.log('[AI] AI_PROVIDER (DB):', configuredProvider || '(not set)');
    console.log('[AI] Groq key length:', groqKey.length);
    console.log('[AI] OpenAI key length:', openaiKey.length);

    // Honour the configured provider when its key is present.
    // Auto-select whichever key IS available so a misconfigured setting
    // doesn't silently prevent all analysis.
    let provider: string;
    if      (configuredProvider === 'groq'   && groqKey)   provider = 'groq';
    else if (configuredProvider === 'openai' && openaiKey) provider = 'openai';
    else if (groqKey)                                      provider = 'groq';
    else if (openaiKey)                                    provider = 'openai';
    else                                                   provider = 'none';

    if (provider !== configuredProvider && configuredProvider) {
      console.warn('[AI] AI_PROVIDER is "' + configuredProvider
        + '" but its key is missing — auto-switched to "' + provider + '"');
    }
    console.log('[AI] provider selected:', provider);

    const userMessage = buildUserMessage(content);

    if (provider === 'groq')   return await analyzeWithGroq(userMessage, groqKey);
    if (provider === 'openai') return await analyzeWithOpenAI(userMessage, openaiKey);

    console.warn('[AI] No API keys configured — falling back to keyword classifier');
    return getDefaultAnalysis(userMessage);
  } catch (error: any) {
    // Only null on a truly unexpected fatal exception (e.g. DB unreachable at settings load).
    console.error('[AI] analyzeWithAI error:', error?.message ?? String(error));
    console.error('[AI] stack:', error?.stack);
    return null;
  }
}

// ─── Groq path ─────────────────────────────────────────────────────────────────
// Never returns null. All failures fall back to getDefaultAnalysis().

async function analyzeWithGroq(content: string, apiKey: string): Promise<AIAnalysisResult> {
  if (!apiKey) {
    console.warn('[AI] analyzeWithGroq: key is empty — falling back to keyword classifier');
    return getDefaultAnalysis(content);
  }

  for (const model of GROQ_MODELS) {
    console.log('[AI] Groq model:', model);

    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          { role: 'user',   content },
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content;
      console.log('[AI] Groq raw response:', text?.substring(0, 600));

      if (!text) {
        console.warn('[AI] Groq returned empty content from model:', model, '— trying next');
        continue;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (e: any) {
        // Req 8: log raw + return keyword fallback immediately (do not try next model).
        console.error('[AI] Groq JSON parse error:', e.message, '| raw:', text);
        console.log('[AI] Groq fallback used');
        return getDefaultAnalysis(content);
      }

      const result = normalizeAnalysis(parsed);
      result.model = model;
      console.log('[AI] Groq classification success | model:', model,
        '| classifiedAs:', result.classifiedAs,
        '| confidence:', result.confidence,
        '| shouldNotify:', result.shouldNotify);
      return result;

    } catch (err: any) {
      const status: number | undefined = err?.status ?? err?.statusCode;

      if (status === 404) {
        // Model not available on this key — try the next one in the list.
        console.warn('[AI] Groq model', model, 'not found (404) — trying next model');
        continue;
      }

      // Req 9: rate limit (429), auth error, network error → return keyword fallback, never null.
      console.warn('[AI] Groq error (status:', status ?? 'network', '):', err.message);
      console.log('[AI] Groq fallback used');
      return getDefaultAnalysis(content);
    }
  }

  // Every model in the list returned 404 or empty content.
  console.log('[AI] Groq fallback used — all models exhausted');
  return getDefaultAnalysis(content);
}

// ─── OpenAI path ──────────────────────────────────────────────────────────────
// Never returns null. All failures fall back to getDefaultAnalysis().

async function analyzeWithOpenAI(content: string, apiKey: string): Promise<AIAnalysisResult> {
  if (!apiKey) {
    console.warn('[AI] analyzeWithOpenAI: key is empty — falling back to keyword classifier');
    return getDefaultAnalysis(content);
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user',   content },
      ],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      console.error('[AI] OpenAI returned empty content — falling back to keyword classifier');
      return getDefaultAnalysis(content);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      console.error('[AI] OpenAI JSON parse error:', e.message, '| raw text:', text);
      return getDefaultAnalysis(content);
    }

    const result = normalizeAnalysis(parsed);
    result.model = 'gpt-4o-mini';
    return result;

  } catch (err: any) {
    console.error('[AI] OpenAI API error:', err.message);
    return getDefaultAnalysis(content);
  }
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

function buildUserMessage(content: {
  title: string;
  description?: string;
  brandName: string;
  url?: string;
  imageCount?: number;
  sourceType: string;
  additionalContext?: string;
}): string {
  return [
    `Brand: ${content.brandName}`,
    `Source Type: ${content.sourceType}`,
    `Title/Name: ${content.title}`,
    content.description       ? `Description: ${content.description}`               : null,
    content.url               ? `URL: ${content.url}`                               : null,
    content.imageCount        ? `Images Found: ${content.imageCount}`               : null,
    content.additionalContext ? `Additional Context: ${content.additionalContext}`   : null,
    '',
    'Analyze this and classify it.',
  ].filter((l): l is string => l !== null).join('\n');
}

function normalizeAnalysis(parsed: any): AIAnalysisResult {
  return {
    classifiedAs: parsed.classifiedAs || 'OTHER',
    summary: parsed.summary || '',
    reasoning: parsed.reasoning || '',
    confidence: Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5)),
    importanceScore: Math.min(1, Math.max(0, parseFloat(parsed.importanceScore) || 0.3)),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    productName: parsed.productName || undefined,
    collectionName: parsed.collectionName || undefined,
    shouldNotify: Boolean(parsed.shouldNotify),
  };
}

function getDefaultAnalysis(content: string): AIAnalysisResult {
  // Reached when no working AI key is available OR when Groq/OpenAI fails.
  // "Auto-classified (AI not configured)" in the DB means the AI path was unavailable.
  // Hit GET /api/debug/system to diagnose key issues.
  console.warn('[AI] getDefaultAnalysis called — using keyword classifier');

  const lower = content.toLowerCase();
  let classifiedAs = 'OTHER';
  let importanceScore = 0.3;
  let shouldNotify = false;

  if (lower.includes('new arrival') || lower.includes('just dropped') || lower.includes('new release')) {
    classifiedAs = 'NEW_PRODUCT'; importanceScore = 0.7; shouldNotify = true;
  } else if (lower.includes('collection') || lower.includes('season')) {
    classifiedAs = 'NEW_COLLECTION'; importanceScore = 0.75; shouldNotify = true;
  } else if (lower.includes('limited') || lower.includes('exclusive') || lower.includes('collab')) {
    classifiedAs = 'LIMITED_DROP'; importanceScore = 0.9; shouldNotify = true;
  } else if (lower.includes('restock') || lower.includes('back in stock')) {
    classifiedAs = 'RESTOCK'; importanceScore = 0.6; shouldNotify = true;
  }

  return {
    classifiedAs,
    summary: 'Auto-classified (AI not configured)',
    reasoning: 'Keyword-based classification — no AI API key is available',
    confidence: 0.5,
    importanceScore,
    keywords: [],
    shouldNotify,
  };
}

// ─── DB persistence ───────────────────────────────────────────────────────────

export async function saveAiAnalysis(discoveryId: string, analysis: AIAnalysisResult, model?: string) {
  const resolvedModel = model || analysis.model;
  return prisma.aiAnalysis.upsert({
    where: { discoveryId },
    update: {
      classifiedAs: analysis.classifiedAs as any,
      summary: analysis.summary,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      importanceScore: analysis.importanceScore,
      keywords: analysis.keywords,
      productName: analysis.productName,
      collectionName: analysis.collectionName,
      shouldNotify: analysis.shouldNotify,
      rawResponse: analysis as any,
      model: resolvedModel,
    },
    create: {
      discoveryId,
      classifiedAs: analysis.classifiedAs as any,
      summary: analysis.summary,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      importanceScore: analysis.importanceScore,
      keywords: analysis.keywords,
      productName: analysis.productName,
      collectionName: analysis.collectionName,
      shouldNotify: analysis.shouldNotify,
      rawResponse: analysis as any,
      model: resolvedModel,
    },
  });
}
