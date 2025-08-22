import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateSheetCell, isGoogleSheetsConfigured } from '@/lib/mom/google-sheets';

// **SPREADSHEET DATA FETCH**: GET endpoint to fetch sheet data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range');

    if (!range) {
      return NextResponse.json(
        { success: false, error: 'Range parameter is required' },
        { status: 400 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock data for demo
      return NextResponse.json({
        success: true,
        data: [
          ['Header 1', 'Header 2', 'Header 3'],
          ['Row 1 Cell 1', 'Row 1 Cell 2', 'Row 1 Cell 3'],
          ['Row 2 Cell 1', 'Row 2 Cell 2', 'Row 2 Cell 3'],
        ],
      });
    }

    const data = await getSheetData(range);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching spreadsheet data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch spreadsheet data' },
      { status: 500 }
    );
  }
}

// **INLINE EDITING**: POST endpoint to update a cell
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { range, value } = body;

    if (!range || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Range and value are required' },
        { status: 400 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return success for demo
      return NextResponse.json({
        success: true,
        message: 'Cell updated successfully (demo mode)',
      });
    }

    await updateSheetCell(range, value);
    return NextResponse.json({ 
      success: true, 
      message: 'Cell updated successfully' 
    });
  } catch (error) {
    console.error('Error updating cell:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cell' },
      { status: 500 }
    );
  }
}