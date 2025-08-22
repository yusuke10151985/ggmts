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

  // ユーザーごとの集計（フィルタ適用）- nullユーザーも含む
  const userStats = await prisma.apiUsageLog.groupBy({
    by: ['userId'],
    where,
    _sum: { tokens: true, cost: true },
    _count: { _all: true },
  });

  // ユーザーごと・モデルごとの集計（フィルタ適用）- nullユーザーも含む
  const userStatsByModel = await prisma.apiUsageLog.groupBy({
    by: ['userId', 'model'],
    where,
    _sum: { tokens: true, cost: true },
    _count: { _all: true },
  });

  // ユーザー情報を付加してuserStatsを拡張
  const userStatsWithDetails = await Promise.all(
    userStats.map(async (stat: any) => {
      let userDetails = null;
      if (stat.userId) {
        try {
          userDetails = await prisma.user.findUnique({
            where: { id: stat.userId },
            select: { id: true, name: true, email: true, role: true }
          });
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      }
      return {
        ...stat,
        userDetails
      };
    })
  );

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

  return NextResponse.json({ 
    logs, 
    userStats: userStatsWithDetails, 
    userStatsByModel, 
    total, 
    dailyStats 
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // POSTは認証済みユーザーなら誰でも使用可能（自分の使用状況を記録するため）
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, apiType, model, inputText, result, tokens, cost } = body;

    // ユーザーIDが一致することを確認（管理者は他のユーザーのログも記録可能）
    if (session.user.role !== 'admin' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // API使用ログを作成
    const log = await prisma.apiUsageLog.create({
      data: {
        userId,
        apiType: apiType || 'generate',
        provider: model?.includes('gpt') ? 'openai' : 'google',
        model: model || 'gemini-1.5-flash',
        tokens: tokens || 0,
        cost: cost || 0,
        inputText: inputText?.substring(0, 500) || '',
        result: result ? JSON.stringify(result).substring(0, 1000) : '',
      },
    });

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error) {
    console.error('Error creating usage log:', error);
    return NextResponse.json(
      { error: 'Failed to create usage log' },
      { status: 500 }
    );
  }
} 