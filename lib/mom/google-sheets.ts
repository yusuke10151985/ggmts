import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Check if Google Sheets is configured
export function isGoogleSheetsConfigured() {
  return !!(
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

// Initialize the Google Sheets API client
export function getGoogleSheetsClient() {
  if (!isGoogleSheetsConfigured()) {
    throw new Error('Google Sheets not configured. Please set environment variables.');
  }

  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Helper function to get sheet data
export async function getSheetData(range: string) {
  const sheets = getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  });
  return response.data.values || [];
}

// Helper function to update sheet data
export async function updateSheetData(range: string, values: any[][]) {
  const sheets = getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  return response.data;
}

// Helper function to append data to sheet
export async function appendSheetData(range: string, values: any[][]) {
  const sheets = getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
  return response.data;
}

// Helper function to batch update sheet
export async function batchUpdateSheet(requests: any[]) {
  const sheets = getGoogleSheetsClient();
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: { requests },
  });
  return response.data;
}

// **INLINE EDITING**: Update a single cell value
export async function updateSheetCell(range: string, value: any) {
  const sheets = getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
  return response.data;
}

// **SHEET MANAGEMENT**: Ensure a sheet exists with the given name
export async function ensureSheetExists(sheetName: string) {
  const sheets = getGoogleSheetsClient();
  
  try {
    // Get spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });
    
    // Check if sheet already exists
    const existingSheets = spreadsheet.data.sheets || [];
    const sheetExists = existingSheets.some(sheet => sheet.properties?.title === sheetName);
    
    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
      
      // Add headers for Tasks sheet
      if (sheetName === 'Tasks') {
        await updateSheetData('Tasks!A1:J1', [[
          'Action ID',
          'MOM ID',
          'Revision',
          'Title',
          'Status',
          'Responsible Parties',
          'Due Date',
          'Details',
          'Created Date',
          'Last Modified',
        ]]);
      }
    }
  } catch (error) {
    console.error(`Error ensuring sheet '${sheetName}' exists:`, error);
    // Don't throw - allow the operation to continue
  }
}