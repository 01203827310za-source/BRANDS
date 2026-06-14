import { NextRequest, NextResponse } from 'next/server';
import { crawlState } from '@/services/crawler/crawlState';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/crawl-status
 *
 * Returns the live progress of the currently running crawl cycle (if any).
 * Reads the in-process singleton — no DB round-trip required.
 *
 * When no crawl is running, running=false and all counters are 0.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json(crawlState.get());
}
