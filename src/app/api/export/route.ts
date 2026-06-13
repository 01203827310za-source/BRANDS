import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'discoveries'; // discoveries | products | brands
  const format = searchParams.get('format') || 'csv';
  const brandId = searchParams.get('brandId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const where: any = {};
  if (brandId) where.brandId = brandId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  let rows: any[] = [];
  let filename = '';

  if (type === 'discoveries') {
    filename = `discoveries-${Date.now()}`;
    const discoveries = await prisma.discovery.findMany({
      where,
      include: {
        brand: { select: { name: true } },
        aiAnalysis: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    rows = discoveries.map(d => ({
      ID: d.id,
      Brand: d.brand.name,
      Type: d.discoveryType,
      Source: d.sourceType,
      Title: d.title,
      Summary: d.summary || '',
      URL: d.url || '',
      Confidence: d.confidenceScore || '',
      Importance: d.importanceScore || '',
      Notified: d.isNotified ? 'Yes' : 'No',
      'Created At': d.createdAt.toISOString(),
      'AI Summary': d.aiAnalysis?.summary || '',
      Keywords: d.aiAnalysis?.keywords?.join(', ') || '',
    }));
  } else if (type === 'products') {
    filename = `products-${Date.now()}`;
    const products = await prisma.product.findMany({
      where,
      include: { brand: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    rows = products.map(p => ({
      ID: p.id,
      Brand: p.brand.name,
      Name: p.name,
      URL: p.url,
      Price: p.price || '',
      'Sale Price': p.salePrice || '',
      Currency: p.currency || '',
      Category: p.category || '',
      Color: p.color || '',
      Gender: p.gender || '',
      Collection: p.collectionName || '',
      'In Stock': p.isInStock ? 'Yes' : 'No',
      'Created At': p.createdAt.toISOString(),
    }));
  } else if (type === 'brands') {
    filename = `brands-${Date.now()}`;
    const brands = await prisma.brand.findMany({
      include: {
        _count: { select: { products: true, discoveries: true } },
      },
      orderBy: { name: 'asc' },
    });
    rows = brands.map(b => ({
      ID: b.id,
      Name: b.name,
      Slug: b.slug,
      Category: b.category,
      Priority: b.priority,
      Active: b.isActive ? 'Yes' : 'No',
      Country: b.country || '',
      Website: b.websiteUrl || '',
      Instagram: b.instagramHandle || '',
      Products: b._count.products,
      Discoveries: b._count.discoveries,
      'Last Crawled': b.lastCrawledAt?.toISOString() || 'Never',
    }));
  }

  if (format === 'csv') {
    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // Excel (basic - return JSON for now, can be enhanced with exceljs)
  return NextResponse.json({ data: rows, filename });
}

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ),
  ];
  return lines.join('\n');
}
