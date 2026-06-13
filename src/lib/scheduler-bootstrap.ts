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

const g = globalThis as typeof globalThis & { schedulerBootstrapped?: boolean };

// Skip during `next build` — DATABASE_URL is not guaranteed at build time on Railway.
// Dynamic import defers loading cron.ts (and its PrismaClient instantiation) until
// after the container starts with DATABASE_URL injected at runtime.
if (process.env.NEXT_PHASE !== 'phase-production-build' && !g.schedulerBootstrapped) {
  g.schedulerBootstrapped = true;
  import('@/services/scheduler/cron')
    .then(({ startScheduler }) => startScheduler())
    .catch((err: Error) => {
      console.error('[Scheduler] Bootstrap failed:', err.message);
      g.schedulerBootstrapped = false;
    });
}

export {};
