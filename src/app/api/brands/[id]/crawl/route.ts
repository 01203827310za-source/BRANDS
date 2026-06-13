import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { crawlBrand } from '@/services/crawler/orchestrator';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Per-brand manual crawl — always force so frequency gates are bypassed
  crawlBrand(params.id, true).catch(console.error);
  return NextResponse.json({ success: true, force: true, message: 'Brand crawl started' });
}
