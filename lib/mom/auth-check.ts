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
  console.log('[Auth Check] Getting session...');
  const session = await getServerSession(authOptions);
  
  console.log('[Auth Check] Session info:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    hasEmail: !!session?.user?.email,
    email: session?.user?.email ? session.user.email.substring(0, 5) + '...' : 'none'
  });
  
  if (!session?.user?.email) {
    console.log('[Auth Check] No authenticated session found');
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
  
  console.log('[Auth Check] Database user:', {
    found: !!user,
    role: user?.role || 'none',
    id: user?.id || 'none'
  });

  // AdminとSpecialユーザーのみアクセス可能
  if (!user || (user.role !== 'admin' && user.role !== 'special')) {
    console.log('[Auth Check] Access denied - insufficient privileges');
    return {
      error: NextResponse.json(
        { success: false, error: 'Admin or Special privileges required' },
        { status: 403 }
      ),
      user: null
    };
  }

  console.log('[Auth Check] Access granted for user:', user.email);
  return { 
    error: null,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}