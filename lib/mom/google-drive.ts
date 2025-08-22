// **GOOGLE DRIVE INTEGRATION**: Upload files to Google Drive and return URLs
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Initialize the Google Drive API client
export function getGoogleDriveClient() {
  // **Google Drive API設定チェック**: 必要な環境変数が設定されているか確認
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error('Google Drive API configuration missing:', {
      hasServiceAccountEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasDriveFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID
    });
    throw new Error('Google Drive API is not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.');
  }

  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata'
    ],
  });

  return google.drive({ version: 'v3', auth });
}

// Convert base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:.*?;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Get MIME type from base64 string
function getMimeType(base64: string): string {
  const matches = base64.match(/^data:(.+?);base64,/);
  return matches ? matches[1] : 'application/octet-stream';
}

// **UPLOAD TO DRIVE**: Upload a file to Google Drive and return the file ID
export async function uploadToDrive(
  fileName: string,
  base64Data: string,
  folderId?: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getGoogleDriveClient();
  
  const mimeType = getMimeType(base64Data);
  const buffer = base64ToBuffer(base64Data);
  
  const fileMetadata: any = {
    name: fileName,
    mimeType: mimeType,
  };
  
  // If folder ID is provided, set it as parent
  if (folderId) {
    fileMetadata.parents = [folderId];
  } else if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
  }
  
  const media = {
    mimeType: mimeType,
    body: require('stream').Readable.from(buffer),
  };
  
  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });
    
    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    return {
      fileId: response.data.id!,
      webViewLink: response.data.webViewLink!,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}

// **GET DRIVE FILE**: Get a file URL from Google Drive
export async function getDriveFileUrl(fileId: string): Promise<string> {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// **DELETE DRIVE FILE**: Delete a file from Google Drive
export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getGoogleDriveClient();
  
  try {
    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error) {
    console.error('Error deleting file from Google Drive:', error);
    // Don't throw error if file doesn't exist
  }
}