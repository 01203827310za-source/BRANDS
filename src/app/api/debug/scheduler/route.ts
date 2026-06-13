import { NextResponse } from 'next/server';
import { getSchedulerStatus } from '@/services/scheduler/cron';

export async function GET() {
  const { isRunning, tasks } = getSchedulerStatus();
  return NextResponse.json({
    isRunning,
    crawlTask: tasks.crawl,
    searchTask: tasks.search,
    digestTask: tasks.digest,
  });
}
