import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@prisma/client';

const db = new prisma.PrismaClient();

export async function GET() {
  const notes = await db.releaseNote.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      content_ja: true,
      content_en: true,
      content_th: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { title, content_ja, content_en, content_th } = await req.json();
  if (!content_ja || !content_en || !content_th) {
    return NextResponse.json({ error: 'All language fields required' }, { status: 400 });
  }
  const note = await db.releaseNote.create({
    data: {
      title,
      content_ja,
      content_en,
      content_th,
      authorId: session.user.id,
    },
  });
  return NextResponse.json(note);
} 