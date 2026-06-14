import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const brand = await prisma.brand.findUnique({
    where: { id: params.id },
    include: {
      sources: true,
      _count: { select: { products: true, discoveries: true, collections: true, instagramPosts: true } },
    },
  });

  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(brand);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = UpdateSchema.parse(body);

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: {
        ...parsed,
        websiteUrl: parsed.websiteUrl || undefined,
        newArrivalsUrl: parsed.newArrivalsUrl || undefined,
        collectionsUrl: parsed.collectionsUrl || undefined,
        launchUrl: parsed.launchUrl || undefined,
        instagramUrl: parsed.instagramUrl || undefined,
      },
    });

    // Keep brand_sources in sync with the URL fields on the brand.
    const sourceMap: Array<{ field: keyof typeof parsed; sourceType: string; crawlFreq: number }> = [
      { field: 'websiteUrl',     sourceType: 'WEBSITE',      crawlFreq: 120 },
      { field: 'newArrivalsUrl', sourceType: 'NEW_ARRIVALS', crawlFreq: 60  },
      { field: 'collectionsUrl', sourceType: 'COLLECTIONS',  crawlFreq: 120 },
      { field: 'instagramUrl',   sourceType: 'INSTAGRAM',    crawlFreq: 30  },
    ];

    for (const { field, sourceType, crawlFreq } of sourceMap) {
      const url = parsed[field] as string | undefined;
      if (url === undefined) continue; // field not included in this request — leave source untouched
      if (!url) continue;              // empty string — leave source untouched rather than storing a blank URL
      await prisma.brandSource.upsert({
        where: { brandId_sourceType: { brandId: params.id, sourceType: sourceType as any } },
        update: { url },
        create: { brandId: params.id, sourceType: sourceType as any, url, crawlFreq, isActive: true, errorCount: 0 },
      });
    }

    await prisma.systemEvent.create({
      data: {
        type: 'BRAND_UPDATED',
        level: 'INFO',
        message: `Brand updated: ${brand.name}`,
        metadata: { brandId: brand.id } as any,
      },
    });

    return NextResponse.json(brand);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const brand = await prisma.brand.findUnique({ where: { id: params.id } });
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.brand.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
