import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, isGoogleSheetsConfigured, appendSheetData } from '@/lib/mom/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock data for demo
      const mockAttendees = [
        { id: 'att-1', name: 'John Doe', email: 'john@companya.com', companyId: 'comp-1' },
        { id: 'att-2', name: 'Jane Smith', email: 'jane@companyb.com', companyId: 'comp-2' },
        { id: 'att-3', name: 'Bob Johnson', email: 'bob@companyc.com', companyId: 'comp-3' },
      ];

      const filteredAttendees = companyId 
        ? mockAttendees.filter(a => a.companyId === companyId)
        : mockAttendees;

      return NextResponse.json({
        success: true,
        data: filteredAttendees,
      });
    }

    // Get attendees from Attendees sheet (including usage count)
    const rows = await getSheetData('Attendees!A2:E');
    
    let attendees = rows.map((row: any[]) => ({
      id: row[0] || '',
      name: row[1] || '',
      email: row[2] || '',
      companyId: row[3] || '',
      usageCount: parseInt(row[4] || '0', 10),
    }));

    // Filter by company if specified
    if (companyId) {
      attendees = attendees.filter(a => a.companyId === companyId);
    }

    return NextResponse.json({ success: true, data: attendees });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}

// **ADD NEW ATTENDEE**: Endpoint to register a new attendee with company linkage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, companyId } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Attendee name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company selection is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock response for demo
      return NextResponse.json({
        success: true,
        data: {
          id: `att-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          companyId: companyId,
        },
      });
    }

    // Generate a unique ID for the attendee
    const attendeeId = `att-${Date.now()}`;
    
    // **ATTENDEE REGISTRATION**: Add new attendee to the Attendees sheet with initial usage count
    // **COMPANY LINKAGE**: The companyId links the attendee to their company
    await appendSheetData('Attendees!A:E', [[
      attendeeId,
      name.trim(),
      email.trim(),
      companyId, // This links the attendee to the selected company
      '0' // Initial usage count
    ]]);

    return NextResponse.json({
      success: true,
      data: {
        id: attendeeId,
        name: name.trim(),
        email: email.trim(),
        companyId: companyId,
      },
    });
  } catch (error) {
    console.error('Error creating attendee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create attendee' },
      { status: 500 }
    );
  }
}