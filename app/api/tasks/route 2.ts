import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendSheetData, updateSheetData, isGoogleSheetsConfigured, ensureSheetExists } from '@/lib/mom/google-sheets';
import { Task } from '@/types/mom';

// **TASK MANAGEMENT**: GET endpoint to fetch all tasks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'open', 'closed', or null for all

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock data for demo
      const mockTasks: Task[] = [
        {
          actionId: 'ACT-123',
          momId: 'MOM-2024-001',
          revision: 1,
          title: 'Sample Task',
          status: 'open',
          responsibleParties: ['John Doe'],
          dueDate: '2024-12-31',
          details: 'Sample task details',
          createdDate: '2024-01-01',
          lastModified: '2024-01-01',
        },
      ];

      const filtered = status 
        ? mockTasks.filter(task => task.status === status)
        : mockTasks;

      return NextResponse.json({
        success: true,
        data: filtered,
      });
    }

    // Ensure Tasks sheet exists
    await ensureSheetExists('Tasks');
    
    // Get tasks from Tasks sheet
    const rows = await getSheetData('Tasks!A2:J');
    
    const tasks: Task[] = rows.map((row: any[]) => ({
      actionId: row[0] || '',
      momId: row[1] || '',
      revision: parseInt(row[2]) || 0,
      title: row[3] || '',
      status: row[4] || 'open',
      responsibleParties: row[5] ? row[5].split(',') : [],
      dueDate: row[6] || '',
      details: row[7] || '',
      createdDate: row[8] || '',
      lastModified: row[9] || '',
    }));

    // Filter by status if specified
    const filteredTasks = status 
      ? tasks.filter(task => task.status === status)
      : tasks;

    return NextResponse.json({ success: true, data: filteredTasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// **TASK MANAGEMENT**: POST endpoint to save/update tasks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks } = body; // Array of tasks to save

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { success: false, error: 'Tasks array is required' },
        { status: 400 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({
        success: true,
        message: 'Tasks saved successfully (demo mode)',
      });
    }

    // Ensure Tasks sheet exists
    await ensureSheetExists('Tasks');
    
    // Get existing tasks
    const existingRows = await getSheetData('Tasks!A2:J');
    const existingTaskIds = new Set(existingRows.map((row: any[]) => row[0]));

    // Separate new and existing tasks
    const newTasks: any[][] = [];
    const updatedTasks: { row: number; data: any[] }[] = [];

    tasks.forEach((task: Task) => {
      const taskRow = [
        task.actionId,
        task.momId,
        task.revision,
        task.title,
        task.status,
        task.responsibleParties?.join(',') || '',
        task.dueDate || '',
        task.details || '',
        task.createdDate,
        task.lastModified,
      ];

      if (existingTaskIds.has(task.actionId)) {
        // Find the row index to update
        const rowIndex = existingRows.findIndex((row: any[]) => row[0] === task.actionId);
        if (rowIndex !== -1) {
          updatedTasks.push({ row: rowIndex + 2, data: taskRow }); // +2 for header and 0-based index
        }
      } else {
        newTasks.push(taskRow);
      }
    });

    // Append new tasks
    if (newTasks.length > 0) {
      await appendSheetData('Tasks!A:J', newTasks);
    }

    // Update existing tasks
    for (const update of updatedTasks) {
      await updateSheetData(`Tasks!A${update.row}:J${update.row}`, [update.data]);
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${tasks.length} tasks`,
    });
  } catch (error) {
    console.error('Error saving tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save tasks' },
      { status: 500 }
    );
  }
}