import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function requireAdminAuth() {
  const result = await getMOMUser();
  if (result.error) {
    return result.error;
  }
  return null; // No error, authorization successful
}

export async function getMOMUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
      user: null
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true }
  });

  // AdminとSpecialユーザーのみアクセス可能
  if (!user || (user.role !== 'admin' && user.role !== 'special')) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Admin or Special privileges required' },
        { status: 403 }
      ),
      user: null
    };
  }

  return { 
    error: null,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}