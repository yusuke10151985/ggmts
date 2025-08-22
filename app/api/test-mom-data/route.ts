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

    // The correct Spreadsheet ID from the provided URL
    const EXPECTED_SPREADSHEET_ID = '15nQLUQxdrOB72O4OR9tSLThnYR8IzWDnEB9QgvYncLA';
    
    const result = {
      expected_spreadsheet_id: EXPECTED_SPREADSHEET_ID,
      configured_ids: {
        SPREADSHEET_ID: process.env.SPREADSHEET_ID || 'NOT SET',
        GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || 'NOT SET',
        NEXT_PUBLIC_GOOGLE_SHEET_ID: process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || 'NOT SET'
      },
      is_correct: process.env.SPREADSHEET_ID === EXPECTED_SPREADSHEET_ID,
      service_account: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'NOT SET',
      data: null as any,
      error: null as string | null
    };

    // Try to read data from the spreadsheet
    if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: privateKey,
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient as any });

        // Try to read from Sheet1 (MOM List)
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: EXPECTED_SPREADSHEET_ID,
          range: 'Sheet1!A1:Z100', // Read first 100 rows
        });

        const rows = response.data.values || [];
        const headers = rows[0] || [];
        const dataRows = rows.slice(1);

        result.data = {
          sheet_name: 'Sheet1',
          headers: headers,
          row_count: dataRows.length,
          sample_data: dataRows.slice(0, 5).map(row => {
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index] || '';
            });
            return obj;
          })
        };

        // Also check Sheet2 for detailed MOM data
        try {
          const sheet2Response = await sheets.spreadsheets.values.get({
            spreadsheetId: EXPECTED_SPREADSHEET_ID,
            range: 'Sheet2!A1:Z10',
          });
          
          const sheet2Rows = sheet2Response.data.values || [];
          result.data.sheet2_preview = {
            headers: sheet2Rows[0] || [],
            row_count: sheet2Rows.length - 1
          };
        } catch (e) {
          // Sheet2 might not exist
        }

      } catch (error: any) {
        result.error = error.message;
        
        // Provide specific guidance based on error
        if (error.message.includes('404')) {
          result.error = 'Spreadsheet not found. Please check the ID.';
        } else if (error.message.includes('403') || error.message.includes('permission')) {
          result.error = `Permission denied. Please share the spreadsheet with: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`;
        } else if (error.message.includes('401')) {
          result.error = 'Authentication failed. Please check your service account credentials.';
        }
      }
    } else {
      result.error = 'Google credentials not configured';
    }

    return NextResponse.json({
      success: result.is_correct && !result.error && result.data,
      result,
      instructions: !result.is_correct ? 
        `Please update these Vercel environment variables to: ${EXPECTED_SPREADSHEET_ID}` :
        result.error ? 
          `Please fix the error: ${result.error}` :
          'Configuration looks good!'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
}