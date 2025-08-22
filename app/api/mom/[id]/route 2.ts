import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, isGoogleSheetsConfigured } from '@/lib/mom/google-sheets';
import { getDriveFileUrl } from '@/lib/mom/google-drive';
import { reassembleChunks } from '@/lib/mom/data-compression';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('Requested MOM ID:', id);
    
    // Handle MOM ID format: MOM-XXXX-Y where Y is revision
    // The revision is always the last part after the final dash
    // and should be a number. This handles MOM IDs with dashes like MOM-2025-009
    const parts = id.split('-');
    
    // Check if the last part is a valid revision number (single digit or small number)
    const lastPart = parts[parts.length - 1];
    let revision: string;
    let momId: string;
    
    // Special handling for MOM ID format
    // If ID has format MOM-YYYY-NNN (where NNN is 3 digits), it's a MOM ID without revision
    // If ID has format MOM-YYYY-NNN-R (where R is 1-2 digits), the last part is revision
    if (parts.length >= 3 && parts[0] === 'MOM' && /^\d{4}$/.test(parts[1]) && /^\d{3}$/.test(parts[2])) {
      // This is MOM-YYYY-NNN format
      if (parts.length === 3) {
        // No revision specified
        revision = '0';
        momId = id;
      } else if (parts.length === 4 && /^\d{1,2}$/.test(parts[3])) {
        // Has revision number at the end
        revision = parts[3];
        momId = parts.slice(0, 3).join('-');
      } else {
        // Invalid format, default to revision 0
        revision = '0';
        momId = id;
      }
    } else {
      // Legacy format handling
      if (lastPart && /^\d{1,2}$/.test(lastPart) && parseInt(lastPart) <= 99) {
        revision = lastPart;
        momId = parts.slice(0, -1).join('-');
      } else {
        // No revision specified, default to 0
        revision = '0';
        momId = id;
      }
    }
    
    console.log('Parsed MOM ID:', momId, 'Revision:', revision);

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      // Return mock data for demo
      return NextResponse.json({
        success: true,
        data: {
          id: 'demo-1',
          momId: momId,
          revision: parseInt(revision),
          title: 'Sample Meeting Minutes',
          date: '2024-01-15',
          companies: [{ id: 'comp-1', name: 'Company A' }],
          attendees: [{ id: 'att-1', name: 'John Doe', email: 'john@companya.com', companyId: 'comp-1' }],
          structure: [],
          status: 'Draft',
        },
      });
    }

    // **DELETE FLAG CHECK**: First check if MOM is deleted
    const listRows = await getSheetData('Sheet1!A2:G');
    const momListRow = listRows.find((row: any[]) => 
      row[0] === momId && row[1] == revision
    );
    
    // If MOM is marked as deleted, return 404
    if (momListRow && momListRow[6] === 'DELETED') {
      return NextResponse.json(
        { success: false, error: 'MOM not found' },
        { status: 404 }
      );
    }
    
    // Get MOM details from Sheet2
    const detailRows = await getSheetData('Sheet2!A:B');
    const momKey = `${momId}-${revision}`;
    
    // Find the row with matching MOM key
    const detailRow = detailRows.find((row: any[]) => row[0] === momKey);
    
    if (detailRow && detailRow[1]) {
      let momData;
      
      // **CHUNKED DATA LOADING**: Check if data is chunked
      try {
        const metadata = JSON.parse(detailRow[1]);
        if (metadata._chunked) {
          // Load all chunks and reassemble
          const chunks: string[] = [];
          console.log(`Loading ${metadata._chunks} chunks for ${momKey}`);
          
          for (let i = 0; i < metadata._chunks; i++) {
            const chunkKey = `${momKey}_chunk_${i}`;
            const chunkRow = detailRows.find((row: any[]) => row[0] === chunkKey);
            if (chunkRow && chunkRow[1]) {
              chunks.push(chunkRow[1]);
              console.log(`Loaded chunk ${i}: ${chunkRow[1].length} characters`);
            } else {
              console.error(`Missing chunk ${i} for ${momKey}`);
              throw new Error(`Missing chunk ${i} for MOM ${momKey}`);
            }
          }
          
          // Reassemble the complete data
          console.log(`Reassembling ${chunks.length} chunks, total length: ${chunks.reduce((sum, chunk) => sum + chunk.length, 0)}`);
          const completeData = reassembleChunks(chunks);
          console.log(`Complete data length: ${completeData.length}`);
          momData = JSON.parse(completeData);
        } else {
          // Regular single-cell data
          momData = metadata;
        }
      } catch (parseError) {
        console.error('Error parsing MOM data:', parseError);
        // Fallback for old format data
        try {
          momData = JSON.parse(detailRow[1]);
        } catch (fallbackError) {
          console.error('Fallback parsing also failed:', fallbackError);
          throw new Error('Failed to parse MOM data');
        }
      }
      
      // **CRITICAL REQUIREMENT 2**: If no previous revision data is included,
      // try to load it for comparison
      if (!momData.previousRevisionData && momData.revision > 0) {
        const previousRevision = momData.revision - 1;
        const previousKey = `${momData.momId}-${previousRevision}`;
        const previousRow = detailRows.find((row: any[]) => row[0] === previousKey);
        if (previousRow && previousRow[1]) {
          try {
            const prevMetadata = JSON.parse(previousRow[1]);
            if (prevMetadata._chunked) {
              // Load chunked previous revision
              const prevChunks: string[] = [];
              for (let i = 0; i < prevMetadata._chunks; i++) {
                const chunkKey = `${previousKey}_chunk_${i}`;
                const chunkRow = detailRows.find((row: any[]) => row[0] === chunkKey);
                if (chunkRow && chunkRow[1]) {
                  prevChunks.push(chunkRow[1]);
                }
              }
              const prevCompleteData = reassembleChunks(prevChunks);
              momData.previousRevisionData = JSON.parse(prevCompleteData);
            } else {
              momData.previousRevisionData = prevMetadata;
            }
          } catch {
            // Fallback for old format
            momData.previousRevisionData = JSON.parse(previousRow[1]);
          }
          momData.baseRevision = previousRevision;
        }
      }
      
      // **ATTACHMENT LOADING**: Load attachments from separate sheet
      try {
        const attachmentRows = await getSheetData('Attachments!A2:I');
        const momAttachments = attachmentRows.filter((row: any[]) => 
          row[1] === momData.momId && row[2] == momData.revision
        );
        
        // Restore attachments to their respective actions
        if (momAttachments.length > 0) {
          const attachmentMap = new Map<string, any[]>();
          
          momAttachments.forEach((row: any[]) => {
            const actionId = row[3];
            if (!attachmentMap.has(actionId)) {
              attachmentMap.set(actionId, []);
            }
            const attachment: any = {
              id: row[4],
              type: row[5],
              annotations: row[7]
            };
            
            // **GOOGLE DRIVE INTEGRATION**: Check if data contains Drive file ID
            if (row[6] && row[6].startsWith('https://drive.google.com/')) {
              // This is a Drive URL
              attachment.driveUrl = row[6];
              attachment.data = row[6]; // Use URL as data for now
              // Extract file ID from URL if needed
              const fileIdMatch = row[6].match(/[?&]id=([^&]+)/);  
              if (fileIdMatch) {
                attachment.driveFileId = fileIdMatch[1];
              }
            } else if (row[6] && row[6].length === 33) {
              // Likely a Drive file ID (33 characters)
              attachment.driveFileId = row[6];
              attachment.driveUrl = getDriveFileUrl(row[6]);
              attachment.data = attachment.driveUrl;
            } else if (row[7] && row[7].startsWith('data:')) {
              // Base64 data is stored in column H (index 7) as a fallback
              attachment.data = row[7];
            } else {
              // Legacy base64 data
              attachment.data = row[7] || row[6];
            }
            
            attachmentMap.get(actionId)?.push(attachment);
          });
          
          // Recursively restore attachments to structure items
          const restoreAttachments = (items: any[]) => {
            items.forEach((item: any) => {
              if (item.actionId && attachmentMap.has(item.actionId)) {
                item.attachments = attachmentMap.get(item.actionId);
              }
              // **GOOGLE DRIVE INTEGRATION**: Restore Drive URLs for attachments
              if (item.attachments && item.attachments.length > 0) {
                item.attachments = item.attachments.map((att: any) => {
                  // Check if attachment has Drive file ID
                  if (att.driveFileId) {
                    return {
                      ...att,
                      data: att.driveUrl || getDriveFileUrl(att.driveFileId)
                    };
                  }
                  return att;
                });
              }
              if (item.children && item.children.length > 0) {
                restoreAttachments(item.children);
              }
            });
          };
          
          if (momData.structure) {
            restoreAttachments(momData.structure);
          }
          
          // **MEETING ATTACHMENTS**: Restore meeting-level attachments
          const meetingAttachments = attachmentMap.get('meeting');
          if (meetingAttachments && meetingAttachments.length > 0) {
            momData.meetingAttachments = meetingAttachments.map((att: any) => {
              // For meeting attachments, restore additional fields
              const attachment: any = {
                id: att.id,
                type: att.type,
                fileName: att.fileName || 'Attachment',
                fileSize: att.fileSize || 0,
                mimeType: att.mimeType || 'application/octet-stream'
              };
              
              // Handle Drive URLs
              if (att.driveFileId) {
                attachment.driveFileId = att.driveFileId;
                attachment.driveUrl = att.driveUrl || getDriveFileUrl(att.driveFileId);
                attachment.data = attachment.driveUrl;
              } else {
                attachment.data = att.data;
              }
              
              return attachment;
            });
          }
        }
      } catch (attachmentError) {
        console.error('Error loading attachments:', attachmentError);
        // Continue without attachments if loading fails
      }
      
      // **MEETING ATTACHMENTS**: Ensure Drive URLs are restored for meeting attachments
      if (momData.meetingAttachments && momData.meetingAttachments.length > 0) {
        momData.meetingAttachments = momData.meetingAttachments.map((att: any) => {
          if (att.driveFileId && !att.data) {
            return {
              ...att,
              data: att.driveUrl || getDriveFileUrl(att.driveFileId)
            };
          }
          return att;
        });
      }
      
      return NextResponse.json({ success: true, data: momData });
    }

    return NextResponse.json(
      { success: false, error: 'MOM not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching MOM:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MOM' },
      { status: 500 }
    );
  }
}