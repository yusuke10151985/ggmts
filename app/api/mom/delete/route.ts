import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateSheetData, isGoogleSheetsConfigured } from '@/lib/mom/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { momId, revision } = body;

    if (!momId || revision === undefined) {
      return NextResponse.json(
        { success: false, error: 'MOM ID and revision are required' },
        { status: 400 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return success for demo mode
      return NextResponse.json({
        success: true,
        message: 'MOM deleted successfully (demo mode)',
      });
    }

    // **DELETE BY STATUS**: Set Status column to "Deleted" instead of using separate delete flag
    // Get all MOMs from the spreadsheet (Status is in column E)
    const rows = await getSheetData('Sheet1!A2:F');
    
    // Find the row index to mark as deleted
    let rowIndexToUpdate = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === momId && parseInt(rows[i][1]) === revision) {
        rowIndexToUpdate = i;
        break;
      }
    }

    if (rowIndexToUpdate === -1) {
      return NextResponse.json(
        { success: false, error: 'MOM not found' },
        { status: 404 }
      );
    }

    // **DELETE BY STATUS APPEND**: Append 'Deleted' to the existing Status instead of replacing it
    const rowToUpdate = rows[rowIndexToUpdate];
    // Ensure the row has enough columns (F is the 6th column)
    while (rowToUpdate.length < 6) {
      rowToUpdate.push('');
    }
    // **安全な削除フラグ実装**: 既存のステータスに " - Deleted" を追加
    // これにより、元のステータス（Draft/Officially Issued）を保持しつつ削除状態を表現
    const currentStatus = rowToUpdate[4] || 'Draft';
    // 既に "Deleted" が含まれている場合は追加しない
    if (!currentStatus.includes('Deleted')) {
      rowToUpdate[4] = currentStatus + ' - Deleted';
    }
    
    // Update only the specific row with the new status (including timestamp in column F)
    const updateRange = `Sheet1!A${rowIndexToUpdate + 2}:F${rowIndexToUpdate + 2}`;
    // Update only the first 6 columns
    const updateData = rowToUpdate.slice(0, 6);
    await updateSheetData(updateRange, [updateData]);

    // **DELETE ATTACHMENTS**: Also delete all attachments for this MOM
    try {
      const attachmentRows = await getSheetData('Attachments!A:I');
      if (attachmentRows && attachmentRows.length > 1) {
        // Find all attachment rows for this MOM and revision
        const rowsToDelete: number[] = [];
        attachmentRows.forEach((row: any[], index: number) => {
          if (index === 0) return; // Skip header
          if (row[1] === momId && row[2] == revision) {
            rowsToDelete.push(index);
          }
        });
        
        if (rowsToDelete.length > 0) {
          console.log(`Deleting ${rowsToDelete.length} attachment rows for ${momId} Rev.${revision}`);
          // Clear the rows (we can't actually delete rows, so we clear them)
          for (const rowIndex of rowsToDelete.reverse()) { // Reverse to avoid index shifting
            const clearRange = `Attachments!A${rowIndex + 1}:I${rowIndex + 1}`;
            await updateSheetData(clearRange, [['', '', '', '', '', '', '', '', '']]);
          }
        }
      }
    } catch (attachmentError) {
      console.error('Error deleting attachments:', attachmentError);
      // Continue even if attachment deletion fails
    }

    return NextResponse.json({
      success: true,
      message: `MOM ${momId} Rev.${revision} deleted successfully`,
    });

  } catch (error) {
    console.error('Error deleting MOM:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete MOM' },
      { status: 500 }
    );
  }
}