import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { updateSettings, invalidateCache } from '@/services/settings';
import { testTelegramConnection } from '@/services/telegram/notifier';

// Keys that must never be overwritten with an empty string via the settings form.
// If the user clears one of these fields and saves, the existing DB value is preserved.
const PROTECTED_SECRET_KEYS = new Set([
  'TELEGRAM_BOT_TOKEN',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
]);

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};

  for (const s of settings) {
    // Mask secrets in response
    if (s.isSecret && s.value) {
      map[s.key] = s.value.substring(0, 4) + '••••••••';
    } else {
      map[s.key] = s.value || '';
    }
  }

  return NextResponse.json(map);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const updates: Record<string, string> = {};

    const ALLOWED_KEYS = [
      'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'OPENAI_API_KEY', 'GROQ_API_KEY',
      'AI_PROVIDER', 'CRAWL_INTERVAL_MINUTES', 'SEARCH_INTERVAL_HOURS',
      'AI_CONFIDENCE_THRESHOLD', 'IMPORTANCE_THRESHOLD', 'DAILY_DIGEST_HOUR',
      'MAX_RETRIES', 'NOTIFICATION_TYPES',
    ];

    for (const key of ALLOWED_KEYS) {
      if (body[key] === undefined) continue;

      // Issue 3 fix: coerce to string BEFORE calling .includes() so we never
      // throw on non-string body values (null, number, etc.).
      const val = String(body[key] ?? '');

      // Don't overwrite with a masked value returned by our own GET endpoint
      if (val.includes('••••')) continue;

      // Issue 3 fix: don't overwrite real API keys with an empty string.
      // This prevents a user accidentally clearing a field from wiping the key.
      if (val === '' && PROTECTED_SECRET_KEYS.has(key)) continue;

      updates[key] = val;
    }

    await updateSettings(updates);
    invalidateCache();

    await prisma.systemEvent.create({
      data: {
        type: 'SETTINGS_UPDATED',
        level: 'INFO',
        message: 'Settings updated',
        metadata: { keys: Object.keys(updates) } as any,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, ...params } = await req.json();

  if (action === 'test-telegram') {
    const { botToken, chatId } = params;
    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Missing bot token or chat ID' }, { status: 400 });
    }
    const result = await testTelegramConnection(botToken, chatId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
