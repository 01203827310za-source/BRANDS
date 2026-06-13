import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
