import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'debug-logs');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }
    
    // Create filename with timestamp
    const filename = `mom-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(logsDir, filename);
    
    // Write logs to file
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    
    console.log('[Debug Logs] Received client logs:', {
      platform: data.platform,
      url: data.url,
      logCount: data.logs?.length || 0,
      errors: data.logs?.filter((l: any) => l.level === 'error').length || 0,
      savedTo: filepath
    });
    
    // Log errors to console for immediate visibility
    const errors = data.logs?.filter((l: any) => l.level === 'error') || [];
    if (errors.length > 0) {
      console.error('[Debug Logs] Client errors detected:');
      errors.forEach((error: any) => {
        console.error(`  [${error.component}] ${error.message}`, error.data);
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logs received',
      filename 
    });
  } catch (error) {
    console.error('[Debug Logs] Error saving logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save logs' },
      { status: 500 }
    );
  }
}