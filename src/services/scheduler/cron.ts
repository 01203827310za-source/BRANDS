import cron from 'node-cron';
import { crawlAllActiveBrands } from '@/services/crawler/orchestrator';
import { runWebSearchForAllBrands } from '@/services/search/webSearch';
import { sendDailyDigest } from '@/services/telegram/notifier';
import { getSettings } from '@/services/settings';
import { prisma } from '@/lib/db';

let crawlTask: cron.ScheduledTask | null = null;
let searchTask: cron.ScheduledTask | null = null;
let digestTask: cron.ScheduledTask | null = null;
let isRunning = false;

export async function startScheduler(): Promise<void> {
  if (isRunning) return;

  console.log('[Scheduler] Booting...');
  isRunning = true;

  const settings = await getSettings();
  const crawlInterval = parseInt(settings.CRAWL_INTERVAL_MINUTES || '60');
  const digestHour = parseInt(settings.DAILY_DIGEST_HOUR || '8');

  // Crawl job — every N minutes
  const crawlCron = minutesToCron(crawlInterval);
  crawlTask = cron.schedule(crawlCron, async () => {
    console.log('[Scheduler] Starting scheduled crawl cycle (force=false)...');
    try {
      await crawlAllActiveBrands(false);
    } catch (error: any) {
      console.error('[Scheduler] Crawl error:', error.message);
    }
  });

  // Web search — every 6 hours
  searchTask = cron.schedule('0 */6 * * *', async () => {
    console.log('[Scheduler] Starting web search...');
    try {
      await runWebSearchForAllBrands();
    } catch (error: any) {
      console.error('[Scheduler] Search error:', error.message);
    }
  });

  // Daily digest
  digestTask = cron.schedule(`0 ${digestHour} * * *`, async () => {
    console.log('[Scheduler] Sending daily digest...');
    try {
      await sendDailyDigestReport();
    } catch (error: any) {
      console.error('[Scheduler] Digest error:', error.message);
    }
  });

  // Cleanup old logs — daily at 3am
  cron.schedule('0 3 * * *', async () => {
    await cleanupOldLogs();
  });

  console.log('[Scheduler] Started successfully');
  console.log(`  - Crawl: every ${crawlInterval} minutes`);
  console.log(`  - Web search: every 6 hours`);
  console.log(`  - Daily digest: ${digestHour}:00 UTC`);
  console.log('[Scheduler] Status: active');

  await prisma.systemEvent.create({
    data: {
      type: 'SYSTEM_START',
      level: 'INFO',
      message: 'Scheduler started',
      metadata: { crawlInterval, digestHour } as any,
    },
  });
}

export function stopScheduler(): void {
  crawlTask?.stop();
  searchTask?.stop();
  digestTask?.stop();
  isRunning = false;
  console.log('[Scheduler] Stopped');
}

async function sendDailyDigestReport(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [products, collections, drops, activeBrands] = await Promise.all([
    prisma.discovery.count({
      where: { createdAt: { gte: today }, discoveryType: 'NEW_PRODUCT' },
    }),
    prisma.discovery.count({
      where: { createdAt: { gte: today }, discoveryType: 'NEW_COLLECTION' },
    }),
    prisma.discovery.count({
      where: { createdAt: { gte: today }, discoveryType: 'LIMITED_DROP' },
    }),
    prisma.brand.count({ where: { isActive: true } }),
  ]);

  await sendDailyDigest({
    productsFound: products,
    collectionsFound: collections,
    dropsFound: drops,
    brandsMonitored: activeBrands,
    date: new Date(),
  });
}

async function cleanupOldLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  await prisma.crawlLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await prisma.systemEvent.deleteMany({ where: { createdAt: { lt: cutoff }, level: 'DEBUG' } });
}

function minutesToCron(minutes: number): string {
  if (minutes < 60) return `*/${minutes} * * * *`;
  const hours = Math.floor(minutes / 60);
  return `0 */${hours} * * *`;
}

export function getSchedulerStatus() {
  return {
    isRunning,
    tasks: {
      crawl: crawlTask ? 'active' : 'inactive',
      search: searchTask ? 'active' : 'inactive',
      digest: digestTask ? 'active' : 'inactive',
    },
  };
}
