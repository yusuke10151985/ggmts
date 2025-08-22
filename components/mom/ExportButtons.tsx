'use client';

import React, { useState } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { exportToMarkdown, exportToGoogleDocs, generatePDFFilename } from '@/utils/mom/export';
import { exportToPDFviaHTML } from '@/utils/mom/export-pdf-html';

export default function ExportButtons() {
  const { state } = useMOM();
  const { currentMOM } = state;
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  if (!currentMOM) return null;

  const handleViewAsHTML = () => {
    try {
      const html = exportToGoogleDocs(currentMOM);
      // Create a blob URL
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      // Open in new tab
      window.open(url, '_blank');
      // Clean up the URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error viewing as HTML:', error);
      alert('Failed to view as HTML. Please try again.');
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const markdown = exportToMarkdown(currentMOM);
      await navigator.clipboard.writeText(markdown);
      alert('Markdown copied to clipboard!');
    } catch (error) {
      console.error('Error copying markdown:', error);
      alert('Failed to copy Markdown to clipboard. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      
      // Use HTML-based PDF export for better text selection
      exportToPDFviaHTML(currentMOM);
      
      // Wait a bit before resetting the button
      setTimeout(() => {
        setIsExportingPDF(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
      setIsExportingPDF(false);
    }
  };

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="mb-4">Export Options</h2>
      
      <div className="flex gap-4 flex-wrap">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleExportPDF}
          disabled={isExportingPDF}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>{isExportingPDF ? 'Generating PDF...' : 'Export as PDF'}</span>
        </button>
        
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          onClick={handleViewAsHTML}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span>View as HTML</span>
        </button>
        
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          onClick={handleCopyMarkdown}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy Markdown</span>
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>• Export as PDF downloads the MOM as a PDF file with proper formatting</p>
        <p>• View as HTML opens the MOM content in a new browser tab</p>
        <p>• Copy Markdown copies the MOM content to clipboard in Markdown format</p>
      </div>
    </section>
  );
}