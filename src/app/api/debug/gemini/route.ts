import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSettings } from '@/services/settings';

/**
 * GET /api/debug/groq  (path kept as /debug/gemini for backwards compat)
 *
 * NOTE: Gemini has been replaced by Groq. This endpoint now probes
 * the Groq API directly with a real chat-completion call so the
 * raw response, model used, and any parse errors are visible.
 *
 * Useful to confirm:
 *   - Which Groq model responds with the configured key
 *   - Whether the response parses into a valid AIAnalysisResult shape
 *   - The exact raw text when something goes wrong
 */
export async function GET(_req: NextRequest) {
  const settings = await getSettings();
  const groqKey = settings.GROQ_API_KEY || '';

  if (!groqKey) {
    return NextResponse.json({
      apiKeyLoaded: false,
      testSuccess: false,
      error: 'GROQ_API_KEY is not set in the database',
      rawText: null,
      modelUsed: null,
      parsedResponse: null,
    });
  }

  const testContent = [
    'Brand: Nike',
    'Source Type: WEBSITE',
    'Title/Name: Air Jordan 1 Retro High OG "Chicago" — dropping now',
    'Description: Limited release, extremely limited pairs. Shock-drop at 9AM EST.',
    '',
    'Analyze this and classify it.',
  ].join('\n');

  const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] as const;

  for (const model of GROQ_MODELS) {
    try {
      const client = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a brand intelligence analyst. Respond only with valid JSON matching the AIAnalysisResult schema.',
          },
          { role: 'user', content: testContent },
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      const rawText = response.choices[0]?.message?.content ?? null;

      let parsedResponse: any = null;
      let parseError: string | null = null;
      try {
        if (rawText) parsedResponse = JSON.parse(rawText);
      } catch (e: any) {
        parseError = e.message;
      }

      return NextResponse.json({
        apiKeyLoaded: true,
        modelUsed:    model,
        finishReason: response.choices[0]?.finish_reason,
        usage:        response.usage,
        rawText,
        parseError,
        parsedResponse,
        testSuccess: !!parsedResponse && !parseError,
        error: null,
      });

    } catch (err: any) {
      if (err?.status === 404) continue; // try next model
      return NextResponse.json({
        apiKeyLoaded: true,
        modelUsed:    model,
        testSuccess:  false,
        error:        err.message,
        rawText:      null,
        parsedResponse: null,
      });
    }
  }

  return NextResponse.json({
    apiKeyLoaded: true,
    testSuccess:  false,
    error:        'All Groq models returned 404 — check model names or key permissions',
    rawText:      null,
    modelUsed:    null,
    parsedResponse: null,
  });
}
