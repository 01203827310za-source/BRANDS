import { startScheduler } from '../services/scheduler/cron';
import { prisma } from '../lib/db';

async function main() {
  console.log('[Worker] Brand Monitor Background Worker starting…');

  // Wait for DB
  let retries = 0;
  while (retries < 10) {
    try {
      await prisma.$connect();
      console.log('[Worker] Database connected');
      break;
    } catch (error) {
      retries++;
      console.warn(`[Worker] DB connection attempt ${retries}/10 failed, retrying in 3s…`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Start scheduler
  await startScheduler();
  console.log('[Worker] Scheduler running. Press Ctrl+C to stop.');

  // Keep process alive
  process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM received, shutting down…');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT received, shutting down…');
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
