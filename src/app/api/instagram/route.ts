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
      { caption: { contains: search, mode: 'insensitive' } },
      { hashtags: { hasSome: [search.toLowerCase()] } },
    ];
  }
  if (brandId) where.brandId = brandId;

  const [total, posts] = await Promise.all([
    prisma.instagramPost.count({ where }),
    prisma.instagramPost.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true, slug: true, instagramHandle: true } },
        discoveries: {
          select: { id: true, discoveryType: true },
          take: 1,
        },
      },
      orderBy: { postedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Flatten discovery type onto each post
  const data = posts.map(p => ({
    ...p,
    isProductRelated: p.discoveries.length > 0,
    detectedType: p.discoveries[0]?.discoveryType || null,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
