// Scheduler bootstrap — imported as a side effect from src/app/layout.tsx.
//
// Why this file exists instead of instrumentation.ts:
//   Next.js compiles instrumentation.ts for both Node.js AND Edge runtimes.
//   The Edge webpack target cannot resolve Node.js built-ins (path, crypto, fs …)
//   that node-cron and the crawler depend on, so the build fails.
//   The root layout is a React Server Component; Next.js compiles it ONLY for the
//   Node.js target, where every built-in is an automatic external. No bundling error.
//
// Singleton guard:
//   Module-level variables are reset when modules are re-evaluated during hot reload.
//   globalThis persists for the lifetime of the OS process, so the flag survives
//   every reload and prevents the scheduler from being started more than once.

import { startScheduler } from '@/services/scheduler/cron';

const g = globalThis as typeof globalThis & { schedulerBootstrapped?: boolean };

if (!g.schedulerBootstrapped) {
  g.schedulerBootstrapped = true;
  startScheduler().catch((err: Error) => {
    console.error('[Scheduler] Bootstrap failed:', err.message);
    g.schedulerBootstrapped = false; // allow retry on next hot reload
  });
}

export {};
