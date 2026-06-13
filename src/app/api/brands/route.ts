import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const BrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  newArrivalsUrl: z.string().url().optional().or(z.literal('')),
  collectionsUrl: z.string().url().optional().or(z.literal('')),
  launchUrl: z.string().url().optional().or(z.literal('')),
  instagramHandle: z.string().optional(),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  country: z.string().optional(),
  category: z.enum(['SPORTSWEAR', 'STREETWEAR', 'LUXURY', 'OUTDOOR', 'FASHION', 'FOOTWEAR', 'OTHER']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const isActive = searchParams.get('isActive');

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (isActive !== null && isActive !== '') where.isActive = isActive === 'true';

  const [total, brands] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({
      where,
      include: {
        sources: true,
        _count: { select: { products: true, discoveries: true, collections: true } },
      },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: brands,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = BrandSchema.parse(body);

    const slug = parsed.slug || parsed.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Brand with this slug already exists' }, { status: 409 });
    }

    const brand = await prisma.brand.create({
      data: {
        ...parsed,
        slug,
        websiteUrl: parsed.websiteUrl || null,
        newArrivalsUrl: parsed.newArrivalsUrl || null,
        collectionsUrl: parsed.collectionsUrl || null,
        launchUrl: parsed.launchUrl || null,
        instagramUrl: parsed.instagramUrl || null,
      },
    });

    // Auto-create sources
    const sources = [];
    if (brand.websiteUrl) sources.push({ sourceType: 'WEBSITE' as const, url: brand.websiteUrl, crawlFreq: 120 });
    if (brand.newArrivalsUrl) sources.push({ sourceType: 'NEW_ARRIVALS' as const, url: brand.newArrivalsUrl, crawlFreq: 60 });
    if (brand.collectionsUrl) sources.push({ sourceType: 'COLLECTIONS' as const, url: brand.collectionsUrl, crawlFreq: 120 });
    if (brand.instagramUrl) sources.push({ sourceType: 'INSTAGRAM' as const, url: brand.instagramUrl, crawlFreq: 30 });

    if (sources.length > 0) {
      await prisma.brandSource.createMany({
        data: sources.map(s => ({ ...s, brandId: brand.id })),
      });
    }

    await prisma.systemEvent.create({
      data: {
        type: 'BRAND_ADDED',
        level: 'INFO',
        message: `Brand added: ${brand.name}`,
        metadata: { brandId: brand.id } as any,
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
