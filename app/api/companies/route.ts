import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, isGoogleSheetsConfigured, appendSheetData } from '@/lib/mom/google-sheets';

export async function GET() {
  try {
    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock data for demo
      return NextResponse.json({
        success: true,
        data: [
          { id: 'comp-1', name: 'Company A' },
          { id: 'comp-2', name: 'Company B' },
          { id: 'comp-3', name: 'Company C' },
        ],
      });
    }

    // Get companies from Companies sheet (including usage count)
    const rows = await getSheetData('Companies!A2:C');
    
    const companies = rows.map((row: any[]) => ({
      id: row[0] || '',
      name: row[1] || '',
      usageCount: parseInt(row[2] || '0', 10),
    }));

    return NextResponse.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// **ADD NEW COMPANY**: Endpoint to register a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock response for demo
      return NextResponse.json({
        success: true,
        data: {
          id: `comp-${Date.now()}`,
          name: name.trim(),
        },
      });
    }

    // Generate a unique ID for the company
    const companyId = `comp-${Date.now()}`;
    
    // **COMPANY REGISTRATION**: Add new company to the Companies sheet with initial usage count
    await appendSheetData('Companies!A:C', [[companyId, name.trim(), '0']]);

    return NextResponse.json({
      success: true,
      data: {
        id: companyId,
        name: name.trim(),
      },
    });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create company' },
      { status: 500 }
    );
  }
}