import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  if (!q.trim()) return NextResponse.json({ data: [], total: 0 });

  // Search across discoveries (most comprehensive)
  const discoveries = await prisma.discovery.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { aiAnalysis: { summary: { contains: q, mode: 'insensitive' } } },
        { aiAnalysis: { productName: { contains: q, mode: 'insensitive' } } },
        { aiAnalysis: { collectionName: { contains: q, mode: 'insensitive' } } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      aiAnalysis: {
        select: { summary: true, confidence: true, importanceScore: true, productName: true, collectionName: true },
      },
    },
    orderBy: [
      { importanceScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: pageSize,
  });

  return NextResponse.json({
    data: discoveries,
    total: discoveries.length,
  });
}
