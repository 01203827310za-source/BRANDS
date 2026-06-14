import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '24');
  const search = searchParams.get('search') || '';
  const brandId = searchParams.get('brandId') || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (brandId) where.brandId = brandId;

  const [total, collections] = await Promise.all([
    prisma.collection.count({ where }),
    prisma.collection.findMany({
      where,
      include: {
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
},
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: collections,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
