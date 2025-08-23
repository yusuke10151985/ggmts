import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendSheetData, updateSheetData, isGoogleSheetsConfigured, ensureSheetExists } from '@/lib/mom/google-sheets';
import { uploadToDrive, getDriveFileUrl } from '@/lib/mom/google-drive';
import { Task, StructureItem } from '@/types/mom';
import { splitDataIntoChunks, compressMOMData, getDataSize } from '@/lib/mom/data-compression';
import { getMOMUser } from '@/lib/mom/auth-check';

export async function POST(request: NextRequest) {
  // Check authorization and get user info
  const userResult = await getMOMUser();
  if (userResult.error) return userResult.error;
  const currentUser = userResult.user;
  
  try {
    const body = await request.json();
    const { mom, isDraft } = body;

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock response for demo
      const currentYear = new Date().getFullYear();
      let finalMomId = mom.momId;
      let finalRevision = mom.revision;
      
      if (mom.momId === 'New MOM') {
        // REVISION LOGIC: New MOMs always start at Rev.0
        finalMomId = `MOM-${currentYear}-001`;
        finalRevision = 0; 
      } else if (mom.status === 'Officially Issued') {
        // **CRITICAL REQUIREMENT 1**: After official issue, ANY save increments revision
        finalRevision = mom.revision + 1;
      }
      
      return NextResponse.json({
        success: true,
        data: {
          momId: finalMomId,
          revision: finalRevision,
          status: isDraft ? 'Draft' : 'Officially Issued',
          message: isDraft ? 'MOM saved as draft (demo mode)' : 'MOM officially issued (demo mode)',
        },
      });
    }

    // Get existing MOMs to check for updates
    const rows = await getSheetData('Sheet1!A2:F');
    
    let finalMomId = mom.momId;
    let finalRevision = mom.revision;
    
    // REVISION MANAGEMENT LOGIC
    // =========================
    // 1. New MOMs: Start at Rev.0
    // 2. Save Draft: Never increment revision
    // 3. Officially Issue: 
    //    - If current revision is already officially issued, increment
    //    - Otherwise, keep current revision
    
    // Handle new MOM creation
    if (mom.momId === 'New MOM') {
      // MOM ID GENERATION: Format is MOM-YYYY-NNN (e.g., MOM-2025-001)
      const currentYear = new Date().getFullYear();
      const existingMoms = rows.filter((row: any[]) => row[0]?.startsWith(`MOM-${currentYear}-`));
      const lastNumber = existingMoms.reduce((max: number, row: any[]) => {
        const match = row[0]?.match(/MOM-\d{4}-(\d{3})/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      
      finalMomId = `MOM-${currentYear}-${String(lastNumber + 1).padStart(3, '0')}`;
      finalRevision = 0; // REVISION START: New MOMs always start at Rev.0
    } else if (mom.momId.startsWith('MOM-') && !rows.some((row: any[]) => row[0] === mom.momId)) {
      // **COPY NEW MOM**: If MOM ID is provided but doesn't exist, treat as new MOM
      finalMomId = mom.momId;
      finalRevision = 0; // New MOMs always start at Rev.0
    } else {
      // Existing MOM
      // **CRITICAL REQUIREMENT 1**: Check if ANY revision has been officially issued
      const hasOfficiallyIssuedRevision = rows.some((row: any[]) => 
        row[0] === mom.momId && 
        row[4] === 'Officially Issued'
      );
      
      if (hasOfficiallyIssuedRevision) {
        // **CRITICAL REQUIREMENT 1**: Once a MOM has been officially issued,
        // ANY subsequent save (draft or official) must increment the revision
        
        // Find the highest officially issued revision
        const highestOfficialRevision = rows
          .filter((row: any[]) => row[0] === mom.momId && row[4] === 'Officially Issued')
          .reduce((max: number, row: any[]) => Math.max(max, parseInt(row[1]) || 0), 0);
        
        // Always increment from the highest official revision
        finalRevision = highestOfficialRevision + 1;
      } else {
        // No official issue yet - keep current revision
        finalRevision = mom.revision;
      }
    }
    
    // Find if this exact MOM ID and revision already exists
    const existingIndex = rows.findIndex((row: any[]) => 
      row[0] === finalMomId && parseInt(row[1]) === finalRevision
    );

    const timestamp = new Date().toISOString();
    const status = isDraft ? 'Draft' : 'Officially Issued';
    
    const rowData = [
      finalMomId,
      finalRevision,
      mom.title,
      mom.date,
      status,
      timestamp,
      currentUser?.email || '', // createdBy field
    ];

    if (existingIndex >= 0) {
      // Update existing row (including createdBy field)
      await updateSheetData(`Sheet1!A${existingIndex + 2}:G${existingIndex + 2}`, [rowData]);
    } else {
      // Append new row (including createdBy field)
      await appendSheetData('Sheet1!A2:G', [rowData]);
    }

    // Get existing detail rows for comparison and storage
    const detailRows = await getSheetData('Sheet2!A:B');
    
    // **CRITICAL REQUIREMENT 2**: Load previous revision for comparison
    let previousRevisionData = null;
    if (finalRevision > 0) {
      // Find the previous revision
      const previousRevision = finalRevision - 1;
      const previousKey = `${finalMomId}-${previousRevision}`;
      const previousRow = detailRows.find((row: any[]) => row[0] === previousKey);
      if (previousRow && previousRow[1]) {
        previousRevisionData = JSON.parse(previousRow[1]);
      }
    }
    
    // **ATTACHMENT HANDLING**: Extract attachments and upload to Google Drive
    const attachments: any[] = [];
    const driveAttachments: { [key: string]: { fileId: string; url: string } } = {};
    
    // Check if Google Drive is configured
    const isDriveConfigured = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
    
    const extractAndUploadAttachments = async (items: StructureItem[]) => {
      for (const item of items) {
        if (item.attachments && item.attachments.length > 0) {
          for (const att of item.attachments) {
            // **IMAGE DISAPPEARING FIX**: Upload ALL attachments to Google Drive
            // Previously only uploaded files > 1000 chars, causing small images to be lost
            // Now we upload all files to ensure persistence
            if (att.data) {
              const fileName = `${finalMomId}_${finalRevision}_${att.id}.${att.type}`;
              
              if (isDriveConfigured) {
                try {
                  const driveResult = await uploadToDrive(fileName, att.data);
                
                driveAttachments[att.id] = {
                  fileId: driveResult.fileId,
                  url: driveResult.webViewLink
                };
                
                attachments.push({
                  actionId: item.actionId,
                  attachmentId: att.id,
                  type: att.type,
                  fileId: driveResult.fileId,
                  url: driveResult.webViewLink,
                  annotations: att.annotations
                });
              } catch (uploadError: any) {
                // **Google Drive APIエラー詳細**: エラーの詳細情報を記録
                console.error('Error uploading attachment to Google Drive:', {
                  error: uploadError,
                  message: uploadError?.message,
                  code: uploadError?.code,
                  status: uploadError?.response?.status,
                  statusText: uploadError?.response?.statusText,
                  fileName: fileName,
                  attachmentId: att.id
                });
                // **IMAGE DISAPPEARING CAUSE**: Drive upload failures caused data loss
                // Keep base64 data as fallback when Drive upload fails
                attachments.push({
                  actionId: item.actionId,
                  attachmentId: att.id,
                  type: att.type,
                  data: att.data,
                  annotations: att.annotations
                });
              }
            } else {
              // Google Drive not configured - save Vercel Blob URL or base64 data directly
              console.log('Google Drive not configured, saving attachment data directly');
              const attachmentData: any = {
                actionId: item.actionId,
                attachmentId: att.id,
                type: att.type,
                annotations: att.annotations
              };
              
              // Check if it's a Vercel Blob URL
              if (att.blobUrl || (att.data && att.data.startsWith('https://') && att.data.includes('.vercel-storage.com'))) {
                attachmentData.blobUrl = att.blobUrl || att.data;
                attachmentData.fileName = att.fileName;
                attachmentData.fileSize = att.fileSize;
              } else {
                attachmentData.data = att.data;
              }
              
              attachments.push(attachmentData);
            }
            }
          }
        }
        if (item.children && item.children.length > 0) {
          await extractAndUploadAttachments(item.children);
        }
      }
    };
    
    // Create a copy of MOM without attachment data to reduce size
    const momForStorage = JSON.parse(JSON.stringify(mom));
    
    // **データサイズ削減**: 不要なフィールドを削除
    // Meeting attachmentsのbase64データを削除（Driveにアップロード後）
    if (momForStorage.meetingAttachments) {
      momForStorage.meetingAttachments = momForStorage.meetingAttachments.map((att: any) => {
        // URLタイプの場合はそのまま保持
        if (att.mimeType === 'text/url') {
          return att;
        }
        // その他のファイルはbase64データを削除
        return {
          id: att.id,
          type: att.type,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          // base64データは削除
          data: undefined
        };
      });
    }
    
    // Replace attachment data with Drive URLs in structure items
    const replaceAttachmentData = (items: StructureItem[]) => {
      items.forEach(item => {
        if (item.attachments && item.attachments.length > 0) {
          // **DRIVE URL REPLACEMENT**: Replace base64 data with Drive URLs
          item.attachments = item.attachments.map(att => {
            if (driveAttachments[att.id]) {
              return {
                id: att.id,
                type: att.type,
                data: '', // Clear base64 data
                driveFileId: driveAttachments[att.id].fileId,
                driveUrl: driveAttachments[att.id].url,
                annotations: att.annotations
              };
            }
            // Check if it's a Vercel Blob URL
            if (att.blobUrl || (att.data && att.data.startsWith('https://') && att.data.includes('.vercel-storage.com'))) {
              return {
                id: att.id,
                type: att.type,
                data: '', // Clear base64 data
                blobUrl: att.blobUrl || att.data,
                fileName: att.fileName,
                fileSize: att.fileSize,
                annotations: att.annotations
              };
            }
            // For small data that wasn't uploaded to Drive or Blob
            return {
              id: att.id,
              type: att.type,
              data: att.data,
              annotations: att.annotations
            };
          });
        }
        if (item.children && item.children.length > 0) {
          replaceAttachmentData(item.children);
        }
      });
    };
    
    // Extract and upload attachments to Google Drive
    await extractAndUploadAttachments(mom.structure || []);
    replaceAttachmentData(momForStorage.structure || []);
    
    // **MEETING ATTACHMENTS**: Handle meeting-level attachments
    if (mom.meetingAttachments && mom.meetingAttachments.length > 0) {
      console.log(`Processing ${mom.meetingAttachments.length} meeting attachments for save`);
      for (const att of mom.meetingAttachments) {
        // Skip URL attachments as they don't need Drive upload
        if (att.mimeType === 'text/url') {
          continue;
        }
        // Skip attachments without data (these might be deleted or invalid)
        if (!att.data && !att.blobUrl && !att.driveUrl) {
          console.log(`Skipping attachment ${att.id} - no data`);
          continue;
        }
        if (att.data || att.blobUrl) {
          const fileName = `${finalMomId}_${finalRevision}_meeting_${att.id}.${att.type}`;
          try {
            const driveResult = await uploadToDrive(fileName, att.data);
            
            driveAttachments[att.id] = {
              fileId: driveResult.fileId,
              url: driveResult.webViewLink
            };
            
            // Store meeting attachment info
            attachments.push({
              actionId: 'meeting', // Special ID for meeting attachments
              attachmentId: att.id,
              type: att.type,
              fileName: att.fileName,
              fileSize: att.fileSize,
              mimeType: att.mimeType,
              fileId: driveResult.fileId,
              url: driveResult.webViewLink
            });
          } catch (uploadError: any) {
            // **Google Drive APIエラー詳細**: Meeting attachmentのエラー情報を記録
            console.error('Error uploading meeting attachment to Google Drive:', {
              error: uploadError,
              message: uploadError?.message,
              code: uploadError?.code,
              status: uploadError?.response?.status,
              statusText: uploadError?.response?.statusText,
              fileName: fileName,
              attachmentId: att.id,
              fileSize: att.fileSize,
              mimeType: att.mimeType
            });
            // Keep base64 data as fallback
            attachments.push({
              actionId: 'meeting',
              attachmentId: att.id,
              type: att.type,
              fileName: att.fileName,
              fileSize: att.fileSize,
              mimeType: att.mimeType,
              data: att.data
            });
          }
        } else if (att.blobUrl) {
          // Handle Vercel Blob URLs
          attachments.push({
            actionId: 'meeting',
            attachmentId: att.id,
            type: att.type,
            fileName: att.fileName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            blobUrl: att.blobUrl,
            data: att.blobUrl
          });
        }
      }
      
      // Replace meeting attachment data with Drive URLs
      momForStorage.meetingAttachments = mom.meetingAttachments
        .filter((att: any) => {
          // Filter out attachments without data
          if (att.mimeType === 'text/url') return true;
          return att.data || att.blobUrl || att.driveUrl || driveAttachments[att.id];
        })
        .map((att: any) => {
          // Keep URL attachments as-is
          if (att.mimeType === 'text/url') {
            return att;
          }
          if (driveAttachments[att.id]) {
            return {
              id: att.id,
              type: att.type,
              fileName: att.fileName,
              fileSize: att.fileSize,
              mimeType: att.mimeType,
              data: '', // Clear base64 data
              driveFileId: driveAttachments[att.id].fileId,
              driveUrl: driveAttachments[att.id].url
            };
          }
          // For Vercel Blob or other data
          return att;
        });
    }
    
    // Save detailed MOM data in Sheet2 (without attachment data)
    const momKey = `${finalMomId}-${finalRevision}`;
    const updatedMom = {
      ...momForStorage,
      momId: finalMomId,
      revision: finalRevision,
      status,
      // **CRITICAL REQUIREMENT 2**: Include previous revision data for comparison
      previousRevisionData: previousRevisionData,
      baseRevision: previousRevisionData ? previousRevisionData.revision : 0,
      // **VERCEL BLOB**: Include uploaded files (already contains URLs)
      uploadedFiles: mom.uploadedFiles || [],
      // **USER TRACKING**: Save the user who created/updated this MOM
      createdBy: currentUser?.email || ''
    };
    
    // **DATA COMPRESSION**: Compress MOM data before saving
    const compressedMom = compressMOMData(updatedMom);
    let jsonData = JSON.stringify(compressedMom);
    const dataSize = jsonData.length;
    
    console.log(`MOM data size: ${dataSize} characters for ${finalMomId} Rev.${finalRevision}`);
    
    // **CHUNKED STORAGE**: If data is too large, split into chunks
    const MAX_CHUNK_SIZE = 45000; // Safe limit per cell
    
    if (dataSize > MAX_CHUNK_SIZE) {
      // Split data into chunks
      const chunks = splitDataIntoChunks(jsonData, MAX_CHUNK_SIZE);
      const numChunks = chunks.length;
      
      console.log(`Splitting large MOM data into ${numChunks} chunks`);
      
      // Store metadata in main cell
      const metadata = {
        _chunked: true,
        _chunks: numChunks,
        _dataSize: dataSize,
        momId: finalMomId,
        revision: finalRevision,
        title: mom.title,
        date: mom.date,
        status: status
      };
      
      const detailIndex = detailRows.findIndex((row: any[]) => row[0] === momKey);
      
      // Save metadata in main row
      if (detailIndex >= 0) {
        await updateSheetData(`Sheet2!A${detailIndex + 1}:B${detailIndex + 1}`, [[momKey, JSON.stringify(metadata)]]);
      } else {
        await appendSheetData('Sheet2!A:B', [[momKey, JSON.stringify(metadata)]]);
      }
      
      // Save chunks in separate rows
      for (let i = 0; i < chunks.length; i++) {
        const chunkKey = `${momKey}_chunk_${i}`;
        const chunkIndex = detailRows.findIndex((row: any[]) => row[0] === chunkKey);
        
        if (chunkIndex >= 0) {
          await updateSheetData(`Sheet2!A${chunkIndex + 1}:B${chunkIndex + 1}`, [[chunkKey, chunks[i]]]);
        } else {
          await appendSheetData('Sheet2!A:B', [[chunkKey, chunks[i]]]);
        }
      }
      
      // Clean up old chunks if the number decreased
      let oldChunkIndex = chunks.length;
      let oldChunkKey = `${momKey}_chunk_${oldChunkIndex}`;
      let oldChunkRow = detailRows.findIndex((row: any[]) => row[0] === oldChunkKey);
      
      while (oldChunkRow >= 0) {
        await updateSheetData(`Sheet2!A${oldChunkRow + 1}:B${oldChunkRow + 1}`, [['', '']]);
        oldChunkIndex++;
        oldChunkKey = `${momKey}_chunk_${oldChunkIndex}`;
        oldChunkRow = detailRows.findIndex((row: any[]) => row[0] === oldChunkKey);
      }
    } else {
      // Data fits in single cell
      const detailIndex = detailRows.findIndex((row: any[]) => row[0] === momKey);
      
      if (detailIndex >= 0) {
        await updateSheetData(`Sheet2!A${detailIndex + 1}:B${detailIndex + 1}`, [[momKey, jsonData]]);
      } else {
        await appendSheetData('Sheet2!A:B', [[momKey, jsonData]]);
      }
      
      // Clean up any existing chunks from previous saves
      let chunkIndex = 0;
      let chunkKey = `${momKey}_chunk_${chunkIndex}`;
      let chunkRow = detailRows.findIndex((row: any[]) => row[0] === chunkKey);
      
      while (chunkRow >= 0) {
        await updateSheetData(`Sheet2!A${chunkRow + 1}:B${chunkRow + 1}`, [['', '']]);
        chunkIndex++;
        chunkKey = `${momKey}_chunk_${chunkIndex}`;
        chunkRow = detailRows.findIndex((row: any[]) => row[0] === chunkKey);
      }
    }
    
    // **ATTACHMENT STORAGE**: Save attachments separately if any exist
    if (attachments.length > 0) {
      try {
        // Ensure Attachments sheet exists with headers
        await ensureSheetExists('Attachments');
        
        // Check if headers exist, if not add them
        try {
          const headers = await getSheetData('Attachments!A1:I1');
          if (!headers || headers.length === 0 || !headers[0] || headers[0].length === 0) {
            await updateSheetData('Attachments!A1:I1', [[
              'Key', 'MOM ID', 'Revision', 'Action ID', 'Attachment ID', 
              'Type', 'Data', 'Annotations', 'Timestamp'
            ]]);
          }
        } catch (headerError) {
          // If headers don't exist, add them
          await updateSheetData('Attachments!A1:I1', [[
            'Key', 'MOM ID', 'Revision', 'Action ID', 'Attachment ID', 
            'Type', 'Data', 'Annotations', 'Timestamp'
          ]]);
        }
        
        // **FIX DUPLICATE ATTACHMENTS**: Clear existing attachments for this MOM+revision first
        // to prevent duplicates from accumulating on each save
        try {
          const allAttachments = await getSheetData('Attachments!A:I');
          if (allAttachments && allAttachments.length > 1) { // Skip header row
            // Create a new array without the rows for this MOM+revision
            const filteredAttachments = allAttachments.filter((row: any[], index: number) => {
              if (index === 0) return true; // Keep header
              // Keep rows that don't belong to this MOM+revision
              return !(row[1] === finalMomId && row[2] == finalRevision);
            });
            
            const deletedCount = allAttachments.length - filteredAttachments.length;
            console.log(`Removing ${deletedCount} existing attachment rows for ${finalMomId} Rev.${finalRevision}`);
            
            // Clear the entire sheet and rewrite it with filtered data
            if (filteredAttachments.length === 1) {
              // Only header remains, just clear data rows
              await updateSheetData('Attachments!A2:I1000', []); // Clear up to row 1000
            } else {
              // Rewrite the entire sheet with filtered data
              await updateSheetData(`Attachments!A1:I${filteredAttachments.length}`, filteredAttachments);
              // Clear any remaining rows
              if (allAttachments.length > filteredAttachments.length) {
                const clearStartRow = filteredAttachments.length + 1;
                await updateSheetData(`Attachments!A${clearStartRow}:I${allAttachments.length}`, []);
              }
            }
          }
        } catch (e) {
          console.log('No existing attachments to clear:', e);
        }
        
        // Save each attachment in a separate row
        const attachmentRows: any[][] = [];
        for (const attachment of attachments) {
          const attachmentKey = `${finalMomId}-${finalRevision}-${attachment.attachmentId}`;
          const attachmentRow = [
            attachmentKey,
            finalMomId,
            finalRevision,
            attachment.actionId || '',
            attachment.attachmentId,
            attachment.type,
            attachment.fileId || '', // Store Drive file ID instead of data
            attachment.url || attachment.blobUrl || attachment.data || '', // Store Drive URL, Blob URL or fallback to data
            attachment.annotations || '',
            timestamp
          ];
          attachmentRows.push(attachmentRow);
        }
        
        // Batch append new attachments
        if (attachmentRows.length > 0) {
          console.log(`Saving ${attachmentRows.length} attachments for ${finalMomId} Rev.${finalRevision}`);
          await appendSheetData('Attachments!A2:I', attachmentRows);
        }
      } catch (attachmentError) {
        console.error('Error saving attachments:', attachmentError);
        // Don't fail the whole save if attachment saving fails
      }
    }

    // **TASK MANAGEMENT**: Extract and save all actions as tasks
    const tasks: Task[] = [];
    
    const extractActions = (items: StructureItem[]) => {
      items.forEach(item => {
        if (item.level === 4 && item.actionId) {
          tasks.push({
            actionId: item.actionId,
            momId: finalMomId,
            revision: finalRevision,
            title: item.title,
            status: item.status || 'open',
            responsibleParties: item.responsibleParties?.map((p: any) => p.name) || [],
            dueDate: item.dueDate || '',
            createdDate: timestamp,
            lastModified: timestamp,
          });
        }
        if (item.children && item.children.length > 0) {
          extractActions(item.children);
        }
      });
    };

    extractActions(mom.structure || []);

    // Save tasks if any
    if (tasks.length > 0) {
      try {
        // Ensure Tasks sheet exists
        await ensureSheetExists('Tasks');
        
        // Save tasks to Tasks sheet
        const taskRows = tasks.map(task => [
          task.actionId,
          task.momId,
          task.revision,
          task.title,
          task.status,
          (task.responsibleParties || []).join(','),
          task.dueDate,
          task.createdDate,
          task.lastModified,
        ]);
        
        // Get existing tasks to update or append
        const existingTasks = await getSheetData('Tasks!A2:I');
        const existingTaskIds = new Set(existingTasks.map((row: any[]) => row[0]));
        
        const newTasks = taskRows.filter(row => !existingTaskIds.has(row[0]));
        if (newTasks.length > 0) {
          await appendSheetData('Tasks!A:I', newTasks);
        }
        
        // Update existing tasks
        for (const taskRow of taskRows) {
          if (existingTaskIds.has(taskRow[0])) {
            const rowIndex = existingTasks.findIndex((row: any[]) => row[0] === taskRow[0]) + 2;
            await updateSheetData(`Tasks!A${rowIndex}:I${rowIndex}`, [taskRow]);
          }
        }
      } catch (taskError) {
        console.error('Error saving tasks:', taskError);
        // Don't fail the whole save if task saving fails
      }
    }

    // Update usage counts for companies and attendees
    try {
      const companyIds = mom.companies.map((c: any) => c.id);
      const attendeeIds = mom.attendees.map((a: any) => a.id);
      
      // Call the usage update API
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/usage/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds, attendeeIds }),
      });
    } catch (usageError) {
      console.error('Error updating usage counts:', usageError);
      // Don't fail the save if usage tracking fails
    }

    return NextResponse.json({
      success: true,
      data: {
        momId: finalMomId,
        revision: finalRevision,
        status,
        message: isDraft ? 'MOM saved as draft' : 'MOM officially issued',
      },
    });
  } catch (error) {
    console.error('Error saving MOM:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to save MOM';
    if (error instanceof Error) {
      if (error.message.includes('50000 characters')) {
        errorMessage = 'MOM data is too large. Please reduce the content or remove some attachments.';
      } else if (error.message.includes('Sheet')) {
        errorMessage = 'Error accessing Google Sheets. Please check the spreadsheet configuration.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}