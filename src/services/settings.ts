import { prisma } from '@/lib/db';
import { SettingsMap } from '@/types';

let settingsCache: SettingsMap | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

// Only these keys can be overridden by env vars (API tokens & secrets).
// AI_PROVIDER and other config keys must ONLY come from the database so
// that the Settings UI is the single source of truth.
const ENV_OVERRIDABLE_KEYS: (keyof SettingsMap)[] = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
];

export async function getSettings(): Promise<SettingsMap> {
  const now = Date.now();
  if (settingsCache && now - cacheTime < CACHE_TTL) {
    return settingsCache;
  }

  const dbRows = await prisma.setting.findMany();
  const map: SettingsMap = {};

  for (const s of dbRows) {
    (map as any)[s.key] = s.value || '';
  }

  // Apply env-var overrides ONLY for the explicitly listed keys.
  // This prevents .env values like AI_PROVIDER="openai" from
  // silently overriding the DB value the user set via the UI.
  for (const key of ENV_OVERRIDABLE_KEYS) {
    if (process.env[key]) {
      (map as any)[key] = process.env[key];
    }
  }

  settingsCache = map;
  cacheTime = now;
  return map;
}

export async function getSetting(key: keyof SettingsMap): Promise<string | undefined> {
  // The old code checked process.env[key] for ALL keys, meaning
  // AI_PROVIDER="groq" in .env could override the DB value set via the UI.
  // Now we use the same ENV_OVERRIDABLE_KEYS list as getSettings(), so
  // config-only keys like AI_PROVIDER always come from the database.
  if (ENV_OVERRIDABLE_KEYS.includes(key) && process.env[key]) {
    return process.env[key];
  }
  const settings = await getSettings();
  return (settings as any)[key] || undefined;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  settingsCache = null; // Invalidate cache
}

const SECRET_SETTING_KEYS = new Set([
  'TELEGRAM_BOT_TOKEN',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
]);

export async function updateSettings(updates: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        // Issue 5 fix: when creating a NEW row (seed wasn't run or key is brand-new),
        // mark API key rows as isSecret: true so the GET endpoint masks them correctly.
        create: { key, value, isSecret: SECRET_SETTING_KEYS.has(key) },
      })
    )
  );
  settingsCache = null;
}

export function invalidateCache() {
  settingsCache = null;
}
