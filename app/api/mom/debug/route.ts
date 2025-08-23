import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || 'Unknown';
  const timestamp = new Date().toISOString();
  
  // Get browser info
  const browserInfo = {
    userAgent,
    timestamp,
    url: request.url,
    method: request.method,
    // Check for cache headers
    cacheControl: headersList.get('cache-control'),
    pragma: headersList.get('pragma'),
    // Check authentication
    cookie: headersList.get('cookie') ? 'Present' : 'None',
    // Environment info
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  };
  
  // Check if Google Sheets is configured
  const googleSheetsConfig = {
    hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    hasSpreadsheetId: !!process.env.GOOGLE_SPREADSHEET_ID,
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ? 
      process.env.GOOGLE_SPREADSHEET_ID.substring(0, 10) + '...' : 
      'Not configured',
  };
  
  // Return debug information
  return NextResponse.json({
    success: true,
    debug: {
      browser: browserInfo,
      googleSheets: googleSheetsConfig,
      timestamp,
      message: 'Debug information for troubleshooting display issues',
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}