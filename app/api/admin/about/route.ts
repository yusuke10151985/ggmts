import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// GET: 最新のAboutContent取得
export async function GET() {
  const about = await prisma.aboutContent.findFirst({ orderBy: { updatedAt: 'desc' } });
  return NextResponse.json(about);
}

// PATCH: AboutContentを更新（管理者のみ）
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  const { content_ja, content_en, content_th } = body;
  const updated = await prisma.aboutContent.upsert({
    where: { id: body.id || '' },
    update: { content_ja, content_en, content_th },
    create: { content_ja, content_en, content_th },
  });
  return NextResponse.json(updated);
} 