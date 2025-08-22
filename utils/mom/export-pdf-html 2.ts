// Export to PDF using HTML with print-friendly CSS
import { MOM } from '@/types/mom';
import { exportToGoogleDocsHTML } from './export-google-docs';
import { generatePDFFilename } from './pdf-filename';

export function exportToPDFviaHTML(mom: MOM): void {
  // Get the HTML content
  const html = exportToGoogleDocsHTML(mom);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }
  
  // Build the complete HTML document with print-specific CSS
  const printHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${generatePDFFilename(mom)}</title>
  <style>
    /* Print-specific styles */
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Noto Sans JP", "Noto Sans Thai", Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #000;
      }
      
      /* Hide print button */
      .no-print {
        display: none !important;
      }
      
      /* Ensure text is selectable */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      
      /* Page breaks */
      h1, h2, h3 {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      p, li {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Keep sections together */
      .section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
    
    /* Screen styles */
    @media screen {
      body {
        max-width: 800px;
        margin: 20px auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Noto Sans JP", "Noto Sans Thai", Arial, sans-serif;
      }
      
      .print-button {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        z-index: 1000;
      }
      
      .print-button:hover {
        background-color: #0056b3;
      }
    }
    
    /* Common styles from export */
    .title { font-size: 20pt; font-weight: bold; margin-bottom: 10px; }
    .heading1 { font-size: 16pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
    .heading2 { font-size: 14pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; }
    .heading3 { font-size: 12pt; font-weight: bold; margin-top: 12px; margin-bottom: 6px; }
    .normal { font-size: 11pt; margin-bottom: 5px; }
    .small { font-size: 10pt; color: #666; }
    .url { font-size: 9pt; color: #0066CC; text-decoration: underline; }
    .translation { font-size: 10pt; color: #666; font-style: italic; margin-left: 20px; }
    .revision { color: #CC0000; font-weight: bold; }
    .indent1 { margin-left: 20px; }
    .indent2 { margin-left: 40px; }
    .indent3 { margin-left: 60px; }
    .indent4 { margin-left: 80px; }
    .metadata { margin-bottom: 5px; }
    ul { margin: 10px 0; padding-left: 30px; }
    li { margin: 5px 0; }
    
    /* Ensure proper Unicode rendering */
    body {
      unicode-bidi: embed;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Download as PDF</button>
  ${html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html}
</body>
</html>
  `;
  
  // Write the HTML to the new window
  printWindow.document.write(printHTML);
  printWindow.document.close();
  
  // Trigger print dialog after a short delay to ensure content is loaded
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      
      // Optional: Close the window after printing
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 500);
  };
}