import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '25');
  const search = searchParams.get('search') || '';
  const brandId = searchParams.get('brandId') || '';
  const type = searchParams.get('type') || '';
  const source = searchParams.get('source') || '';
  const isNotified = searchParams.get('isNotified');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') || 'desc';

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (brandId) where.brandId = brandId;
  if (type) where.discoveryType = type;
  if (source) where.sourceType = source;
  if (isNotified !== null && isNotified !== '') where.isNotified = isNotified === 'true';
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const orderBy: any = { [sortBy]: sortDir };

  const [total, discoveries] = await Promise.all([
    prisma.discovery.count({ where }),
    prisma.discovery.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        aiAnalysis: {
          select: {
            id: true, summary: true, confidence: true, importanceScore: true,
            keywords: true, classifiedAs: true, productName: true, collectionName: true,
          },
        },
        notifications: { select: { id: true, status: true, channel: true, sentAt: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: discoveries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
