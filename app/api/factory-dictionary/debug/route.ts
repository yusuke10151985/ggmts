import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const debugInfo: any = {
      supabase: {
        configured: !!supabase,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
      },
      prisma: {
        configured: !!prisma,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
      },
      tests: {}
    };

    // Test Supabase connection if configured
    if (supabase) {
      try {
        const { data, error, count } = await supabase
          .from('factory_terms')
          .select('*', { count: 'exact', head: true });

        debugInfo.tests.supabase = {
          success: !error,
          error: error?.message,
          count: count
        };
      } catch (e: any) {
        debugInfo.tests.supabase = {
          success: false,
          error: e.message
        };
      }
    }

    // Test Prisma connection
    try {
      const count = await prisma.factoryTerm.count();
      debugInfo.tests.prisma = {
        success: true,
        count: count
      };
    } catch (e: any) {
      debugInfo.tests.prisma = {
        success: false,
        error: e.message
      };
    }

    return NextResponse.json(debugInfo);
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error.message
    }, { status: 500 });
  }
}