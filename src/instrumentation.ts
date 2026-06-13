// Scheduler is NOT started here.
//
// instrumentation.ts is compiled by Next.js for BOTH the Node.js runtime and the
// Edge runtime. The Edge webpack target has no Node.js built-ins (path, crypto, fs,
// os, …), so any import chain that reaches node-cron or the crawler modules causes
// "Module not found: Can't resolve 'path'" and similar build errors.
//
// The scheduler is bootstrapped from src/lib/scheduler-bootstrap.ts, which is
// imported as a side effect by the root layout (a React Server Component).
// RSC is compiled only in the Node.js webpack pass, where all built-ins resolve fine.

export function register() {}
