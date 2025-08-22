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
          className="btn btn-primary"
          onClick={handleExportPDF}
          disabled={isExportingPDF}
        >
          {isExportingPDF ? 'Generating PDF...' : 'Export as PDF'}
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={handleViewAsHTML}
        >
          View as HTML
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={handleCopyMarkdown}
        >
          Copy Markdown
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