import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { crawlAllActiveBrands } from '@/services/crawler/orchestrator';
import { crawlState } from '@/services/crawler/crawlState';
import { runWebSearchForAllBrands } from '@/services/search/webSearch';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await req.json();

  if (type === 'crawl') {
    if (crawlState.isRunning()) {
      return NextResponse.json(
        { success: false, error: 'Crawler already running', progress: crawlState.get() },
        { status: 409 }
      );
    }
    // Manual crawl — always force so frequency gates are bypassed
    crawlAllActiveBrands(true).catch(console.error);
    return NextResponse.json({ success: true, force: true, message: 'Manual crawl started' });
  }

  if (type === 'search') {
    runWebSearchForAllBrands().catch(console.error);
    return NextResponse.json({ success: true, message: 'Web search started' });
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(_req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const { prisma } = await import('@/lib/db');
  const [total, jobs] = await Promise.all([
    prisma.crawlJob.count(),
    prisma.crawlJob.findMany({
      include: {
        brand: { select: { name: true, slug: true } },
        logs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: jobs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
