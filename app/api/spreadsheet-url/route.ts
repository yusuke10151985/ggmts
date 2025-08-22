import { NextResponse } from 'next/server';

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    return NextResponse.json(
      { success: false, error: 'Spreadsheet ID not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    },
  });
}