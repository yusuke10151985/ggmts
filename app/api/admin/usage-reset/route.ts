import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { userId } = await req.json();
  if (userId) {
    await prisma.apiUsageLog.deleteMany({ where: { userId } });
    return NextResponse.json({ success: true, message: '指定ユーザーの履歴をリセットしました' });
  } else {
    await prisma.apiUsageLog.deleteMany({});
    return NextResponse.json({ success: true, message: '全ユーザーの履歴をリセットしました' });
  }
} 