import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let role = session?.user?.role ?? 'free';
  // デフォルト上限
  let usageLimit = 20;
  // Settingsから上限取得
  const keyMap: Record<string, string> = {
    free: 'free_user_daily_limit',
    pro: 'pro_user_daily_limit',
    premier: 'premier_user_daily_limit',
    special: 'special_user_daily_limit',
    admin: 'admin_user_daily_limit',
  };
  const key = keyMap[role] || keyMap['free'];
  const setting = await prisma.settings.findUnique({ where: { key } });
  if (setting && !isNaN(Number(setting.value))) {
    usageLimit = Number(setting.value);
  }
  // 今日の利用回数
  let usageCount = 0;
  if (userId) {
    const today = new Date();
    today.setHours(0,0,0,0);
    usageCount = await prisma.apiUsageLog.count({
      where: {
        userId,
        createdAt: { gte: today }
      }
    });
  }
  return NextResponse.json({ usageCount, usageLimit });
} 