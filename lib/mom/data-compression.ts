// Data compression utilities for handling large MOM data

/**
 * Split large data into chunks for storage
 */
export function splitDataIntoChunks(data: string, chunkSize: number = 45000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Reassemble chunks into original data
 */
export function reassembleChunks(chunks: string[]): string {
  return chunks.join('');
}

/**
 * Compress MOM data by removing unnecessary fields
 */
export function compressMOMData(mom: any): any {
  const compressed = JSON.parse(JSON.stringify(mom));
  
  // Remove all base64 data from attachments (should be in Google Drive)
  const removeBase64 = (items: any[]) => {
    if (!items) return;
    items.forEach(item => {
      if (item.attachments) {
        item.attachments = item.attachments.map((att: any) => ({
          id: att.id,
          type: att.type,
          driveFileId: att.driveFileId,
          driveUrl: att.driveUrl,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType
        }));
      }
      if (item.children) {
        removeBase64(item.children);
      }
    });
  };
  
  if (compressed.structure) {
    removeBase64(compressed.structure);
  }
  
  // Remove meeting attachments base64 data
  if (compressed.meetingAttachments) {
    compressed.meetingAttachments = compressed.meetingAttachments.map((att: any) => {
      if (att.mimeType === 'text/url') {
        return att; // Keep URLs as-is
      }
      return {
        id: att.id,
        type: att.type,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        driveFileId: att.driveFileId,
        driveUrl: att.driveUrl
      };
    });
  }
  
  // Remove previousRevisionData if it exists
  delete compressed.previousRevisionData;
  
  return compressed;
}

/**
 * Calculate data size in characters
 */
export function getDataSize(data: any): number {
  return JSON.stringify(data).length;
}