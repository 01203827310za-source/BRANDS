import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalBrands,
    activeBrands,
    totalDiscoveries,
    todayDiscoveries,
    totalProducts,
    newProductsToday,
    totalCollections,
    notificationsSent,
    pendingNotifications,
    recentDiscoveries,
    discoveryTypeCounts,
    brandActivityRaw,
  ] = await Promise.all([
    prisma.brand.count(),
    prisma.brand.count({ where: { isActive: true } }),
    prisma.discovery.count(),
    prisma.discovery.count({ where: { createdAt: { gte: today } } }),
    prisma.product.count(),
    prisma.product.count({ where: { createdAt: { gte: today } } }),
    prisma.collection.count(),
    prisma.notification.count({ where: { status: 'SENT' } }),
    prisma.notification.count({ where: { status: 'PENDING' } }),
    prisma.discovery.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        aiAnalysis: { select: { summary: true, confidence: true, importanceScore: true, productName: true } },
        notifications: { select: { status: true } },
      },
    }),
    prisma.discovery.groupBy({
      by: ['discoveryType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.discovery.groupBy({
      by: ['brandId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
  ]);

  // Enrich brand activity with names
  const brandIds = brandActivityRaw.map(b => b.brandId);
  const brands = await prisma.brand.findMany({
    where: { id: { in: brandIds } },
    select: { id: true, name: true },
  });
  const brandMap = Object.fromEntries(brands.map(b => [b.id, b.name]));

  const brandActivity = brandActivityRaw.map(b => ({
    name: brandMap[b.brandId] || 'Unknown',
    count: b._count.id,
  }));

  // Last 7 days chart data
  const last7Days = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return prisma.discovery.count({
        where: { createdAt: { gte: d, lt: next } },
      }).then(count => ({
        date: d.toISOString().split('T')[0],
        count,
      }));
    })
  );

  return NextResponse.json({
    totalBrands,
    activeBrands,
    totalDiscoveries,
    todayDiscoveries,
    totalProducts,
    newProductsToday,
    totalCollections,
    notificationsSent,
    pendingNotifications,
    recentDiscoveries,
    discoveryTypes: discoveryTypeCounts.map(d => ({
      type: d.discoveryType,
      count: d._count.id,
    })),
    brandActivity,
    last7Days,
  });
}
