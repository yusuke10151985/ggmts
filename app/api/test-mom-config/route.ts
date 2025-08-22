import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        details: 'Please login first'
      }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Not authorized',
        details: 'Admin access required'
      }, { status: 403 });
    }

    // Test environment variables
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        spreadsheetId: {
          configured: !!process.env.SPREADSHEET_ID,
          value: process.env.SPREADSHEET_ID ? '***' + process.env.SPREADSHEET_ID.slice(-6) : 'NOT SET'
        },
        serviceAccount: {
          configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          value: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'NOT SET'
        },
        privateKey: {
          configured: !!process.env.GOOGLE_PRIVATE_KEY,
          valid: false,
          error: null as string | null
        },
        driveFolder: {
          configured: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
          value: process.env.GOOGLE_DRIVE_FOLDER_ID || 'NOT SET'
        },
        docsFolder: {
          configured: !!process.env.GOOGLE_DOCS_FOLDER_ID,
          value: process.env.GOOGLE_DOCS_FOLDER_ID || 'NOT SET'
        },
        geminiApi: {
          configured: !!process.env.GEMINI_API_KEY,
          value: process.env.GEMINI_API_KEY ? '***' + process.env.GEMINI_API_KEY.slice(-6) : 'NOT SET'
        }
      },
      apis: {
        sheets: { enabled: false, error: null as string | null },
        drive: { enabled: false, error: null as string | null },
        docs: { enabled: false, error: null as string | null }
      },
      access: {
        spreadsheet: { accessible: false, error: null as string | null },
        driveFolder: { accessible: false, error: null as string | null },
        docsFolder: { accessible: false, error: null as string | null }
      }
    };

    // Test Google Auth and APIs if private key is configured
    if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        // Parse private key
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        // Create auth client
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: privateKey,
          },
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/documents'
          ],
        });

        const authClient = await auth.getClient();
        results.checks.privateKey.valid = true;

        // Test Sheets API
        try {
          const sheets = google.sheets({ version: 'v4', auth: authClient as any });
          if (process.env.SPREADSHEET_ID) {
            const response = await sheets.spreadsheets.get({
              spreadsheetId: process.env.SPREADSHEET_ID,
            });
            results.apis.sheets.enabled = true;
            results.access.spreadsheet.accessible = true;
          }
        } catch (error: any) {
          results.apis.sheets.error = error.message;
          results.access.spreadsheet.error = error.message;
        }

        // Test Drive API
        try {
          const drive = google.drive({ version: 'v3', auth: authClient as any });
          if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
            const response = await drive.files.get({
              fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
              fields: 'id, name, mimeType'
            });
            results.apis.drive.enabled = true;
            results.access.driveFolder.accessible = true;
          }
        } catch (error: any) {
          results.apis.drive.error = error.message;
          results.access.driveFolder.error = error.message;
        }

        // Test Docs API
        try {
          const docs = google.docs({ version: 'v1', auth: authClient as any });
          if (process.env.GOOGLE_DOCS_FOLDER_ID) {
            // Try to access the folder via Drive API
            const drive = google.drive({ version: 'v3', auth: authClient as any });
            const response = await drive.files.get({
              fileId: process.env.GOOGLE_DOCS_FOLDER_ID,
              fields: 'id, name, mimeType'
            });
            results.apis.docs.enabled = true;
            results.access.docsFolder.accessible = true;
          }
        } catch (error: any) {
          results.apis.docs.error = error.message;
          results.access.docsFolder.error = error.message;
        }

      } catch (error: any) {
        results.checks.privateKey.error = error.message;
      }
    }

    // Summary
    const allConfigured = Object.values(results.checks).every(check => 
      typeof check === 'object' && 'configured' in check ? check.configured : true
    );
    const allAccessible = Object.values(results.access).every(access => access.accessible);

    return NextResponse.json({
      success: allConfigured && allAccessible,
      message: allConfigured && allAccessible 
        ? '✅ All MOM Manager configurations are valid!' 
        : '⚠️ Some configurations need attention',
      results
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
}