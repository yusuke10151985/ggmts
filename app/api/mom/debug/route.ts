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
  
  // Check if Google Sheets is configured - check both possible env var names
  const googleSheetsConfig = {
    // Old naming convention
    hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    hasSpreadsheetId: !!process.env.GOOGLE_SPREADSHEET_ID,
    // New naming convention
    hasServiceAccountEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasSheetId: !!process.env.GOOGLE_SHEET_ID,
    // Drive config
    hasDriveFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    // Values (masked)
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ? 
      process.env.GOOGLE_SPREADSHEET_ID.substring(0, 10) + '...' : 
      'Not configured (GOOGLE_SPREADSHEET_ID)',
    sheetId: process.env.GOOGLE_SHEET_ID ? 
      process.env.GOOGLE_SHEET_ID.substring(0, 10) + '...' : 
      'Not configured (GOOGLE_SHEET_ID)',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.substring(0, 10) + '...' :
      'Not configured',
  };
  
  // Get authentication info (without exposing sensitive data)
  const authInfo = {
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  };
  
  // Return debug information
  return NextResponse.json({
    success: true,
    debug: {
      browser: browserInfo,
      googleSheets: googleSheetsConfig,
      auth: authInfo,
      timestamp,
      message: 'Debug information for troubleshooting display issues',
      instructions: 'Compare this output between working Mac and non-working Windows PC',
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}