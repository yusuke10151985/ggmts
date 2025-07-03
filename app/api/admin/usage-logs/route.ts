import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // クエリパラメータ取得
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const userId = searchParams.get('userId');
  const apiType = searchParams.get('apiType');

  // フィルタ条件
  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (userId) where.userId = userId;
  if (apiType) where.apiType = apiType;

  // 直近100件の履歴（フィルタ適用）
  const logs = await prisma.apiUsageLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  // ユーザーごとの集計（フィルタ適用）
  const userStats = await prisma.apiUsageLog.groupBy({
    by: ['userId'],
    where,
    _sum: { tokens: true, cost: true },
    _count: { _all: true },
  });

  // ユーザーごと・モデルごとの集計（フィルタ適用）
  const userStatsByModel = await prisma.apiUsageLog.groupBy({
    by: ['userId', 'model'],
    where,
    _sum: { tokens: true, cost: true },
    _count: { _all: true },
  });

  // 全体集計（フィルタ適用）
  const total = await prisma.apiUsageLog.aggregate({
    where,
    _sum: { tokens: true, cost: true },
    _count: { _all: true },
  });

  // 日別集計（フィルタ適用）
  const dailyStats = await prisma.apiUsageLog.groupBy({
    by: ['createdAt'],
    where,
    _count: { _all: true },
    _sum: { tokens: true, cost: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ logs, userStats, userStatsByModel, total, dailyStats });
} 