'use client';

import React from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { exportToMarkdown, exportToPDF, exportToGoogleDocs, downloadFile, generatePDFFilename, generateGoogleDocsFilename } from '@/utils/mom/export';

export default function ExportButtons() {
  const { state } = useMOM();
  const { currentMOM } = state;

  if (!currentMOM) return null;

  const handleExportMarkdown = () => {
    const markdown = exportToMarkdown(currentMOM);
    // **ファイル名形式統一**: PDFと同じ形式を使用（.md拡張子）
    const pdfFilename = generatePDFFilename(currentMOM);
    const filename = pdfFilename.replace('.pdf', '.md');
    downloadFile(markdown, filename, 'text/markdown');
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
      const pdfBlob = await exportToPDF(currentMOM);
      // **ファイル名形式**: generatePDFFilename関数を使用
      const filename = generatePDFFilename(currentMOM);
      downloadFile(pdfBlob, filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportGoogleDocs = () => {
    try {
      const html = exportToGoogleDocs(currentMOM);
      const filename = generateGoogleDocsFilename(currentMOM) + '.html';
      downloadFile(html, filename, 'text/html');
    } catch (error) {
      console.error('Error exporting to Google Docs:', error);
      alert('Failed to export to Google Docs format. Please try again.');
    }
  };

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="mb-4">Export Options</h2>
      
      <div className="flex gap-4 flex-wrap">
        <button
          className="btn btn-secondary"
          onClick={handleExportMarkdown}
        >
          Export as Markdown
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={handleCopyMarkdown}
        >
          Copy Markdown
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={handleExportPDF}
        >
          Export as PDF
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={handleExportGoogleDocs}
        >
          Export as Google Docs
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>• Markdown export includes all structured data in a readable format</p>
        <p>• PDF export creates a formatted document with all agenda items</p>
        <p>• Google Docs export creates an HTML file that can be imported into Google Docs</p>
      </div>
    </section>
  );
}