'use client';

import React from 'react';

export default function SpreadsheetLink() {
  const spreadsheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    return null;
  }
  
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Google Spreadsheet Management
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            You can add Companies and Attendees using the buttons below or directly edit in the spreadsheet.
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• <strong>UI Method</strong>: Use &quot;Add New Company&quot; and &quot;Add New Attendee&quot; buttons below (IDs are auto-generated)</p>
            <p>• <strong>Spreadsheet Method</strong>: Add rows directly with format: comp-&#123;timestamp&#125; or att-&#123;timestamp&#125;</p>
            <p>• Changes from spreadsheet require page refresh; UI changes are instant</p>
          </div>
        </div>
        <a
          href={spreadsheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Spreadsheet
        </a>
      </div>
    </div>
  );
}