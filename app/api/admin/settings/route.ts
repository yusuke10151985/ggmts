import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const settings = await prisma.settings.findMany();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { key, value } = await req.json();
  if (!key || typeof value === 'undefined') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const updated = await prisma.settings.update({
    where: { key },
    data: { value },
  });
  return NextResponse.json(updated);
} 