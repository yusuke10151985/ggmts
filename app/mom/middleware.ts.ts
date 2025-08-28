import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return { 
      authorized: false, 
      error: 'You must be logged in to access this feature',
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
      authorized: false, 
      error: 'You must have admin or special privileges to access MoM Manager',
      user: null 
    };
  }

  return { 
    authorized: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}