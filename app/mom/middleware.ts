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
      error: 'You must be logged in to access this feature' 
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  });

  if (!user || user.role !== 'admin') {
    return { 
      authorized: false, 
      error: 'You must have admin privileges to access MoM Manager' 
    };
  }

  return { authorized: true };
}