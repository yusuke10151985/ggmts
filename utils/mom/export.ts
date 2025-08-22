// Export utilities for PDF and Markdown generation

import { MOM, StructureItem } from '@/types/mom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// **PDF UTF-8 FIX**: Import the new UTF-8 compatible PDF export
import { exportToPDFWithUTF8 } from './export-pdf';
// **テキスト選択可能PDF**: 新しいテキストベースのPDFエクスポート関数をインポート
import { exportToPDFWithSelectableText } from './export-pdf-text';
// **UNICODE PDF FIX**: Import the new Unicode-aware PDF export that properly handles Japanese and Thai text
import { exportToPDFWithUnicode } from './export-pdf-unicode-fixed';
// **COMPLETE UNICODE FIX**: Import pdf-lib based implementation for proper Unicode support
import { exportToPDFWithPdfLib } from './export-pdf-pdflib';
// **FINAL UNICODE FIX**: Import the complete Unicode implementation with font embedding
import { exportToPDFWithCompleteUnicode } from './export-pdf-final';
// **ROBUST FIX**: Import the robust implementation that handles all Unicode safely
import { exportToPDFRobust } from './export-pdf-robust';
// **FILENAME GENERATOR**: Import the filename generator functions
import { generatePDFFilename, generateMarkdownFilename } from './pdf-filename';
// **GOOGLE DOCS EXPORT**: Import Google Docs export functionality
import { exportToGoogleDocsHTML, generateGoogleDocsFilename } from './export-google-docs';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';


/**
 * Generates a hierarchical text representation of the structure
 */
function generateStructureText(items: StructureItem[], indent: string = ''): string {
  let text = '';
  
  items.forEach(item => {
    // **HIERARCHICAL NUMBERING**: Use hierarchicalNumber if available
    const number = item.hierarchicalNumber || item.number;
    text += `${indent}[${number}] ${item.title}\n`;
    
    if (item.level === 4) {
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        text += `${indent}   Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}\n`;
      }
      if (item.dueDate) {
        text += `${indent}   Due Date: ${item.dueDate}\n`;
      }
      if (item.status) {
        text += `${indent}   Status: ${item.status.toUpperCase()}\n`;
      }
      if (item.urls && item.urls.length > 0) {
        text += `${indent}   URLs:\n`;
        item.urls.forEach(url => {
          text += `${indent}   - ${url}\n`;
        });
      }
      if (item.attachments && item.attachments.length > 0) {
        text += `${indent}   Attachments: ${item.attachments.length} file(s)\n`;
      }
    }
    
    if (item.children.length > 0) {
      // **HIERARCHICAL NUMBERING**: Increase indentation for better visual hierarchy
      text += generateStructureText(item.children, indent + '    ');
    }
  });
  
  return text;
}

/**
 * Exports MOM to Markdown format
 */
export function exportToMarkdown(mom: MOM): string {
  // **REVISION COLOR IN EXPORT**: Include revision information if available
  const currentRevision = mom.revision;
  // **TRANSLATION IN EXPORT**: Show only translations, hide original text
  let markdown = '';
  if (mom.titleTranslations) {
    markdown += `# MOM: ${mom.titleTranslations.en}\n`;
    markdown += `> JA: ${mom.titleTranslations.ja}  \n`;
    markdown += `> TH: ${mom.titleTranslations.th}  \n`;
  } else {
    markdown += `# MOM: ${mom.title}\n`; // Fallback to original if no translations
  }
  markdown += `\n`;
  
  // **MEETING GOAL**: Show only translations, hide original text
  if (mom.goal && mom.goalTranslations) {
    markdown += `## Meeting Goal: ${mom.goalTranslations.en}\n`;
    markdown += `> JA: ${mom.goalTranslations.ja}  \n`;
    markdown += `> TH: ${mom.goalTranslations.th}\n\n`;
  } else if (mom.goal) {
    markdown += `## Meeting Goal\n> ${mom.goal}\n\n`; // Fallback to original if no translations
  }
  
  // Metadata - displayed horizontally
  markdown += `**MOM ID:** ${mom.momId} | **Revision:** ${mom.revision} | **Date:** ${mom.date} | **Status:** ${mom.status}  \n\n`;
  
  // Time Slots - displayed horizontally
  if (mom.mainTimeSlot) {
    let timeStr = `**Time:** ${mom.mainTimeSlot.country} (${mom.mainTimeSlot.timezone}): ${mom.mainTimeSlot.startTime} - ${mom.mainTimeSlot.endTime}`;
    
    if (mom.otherTimeSlots && mom.otherTimeSlots.length > 0) {
      mom.otherTimeSlots.forEach(slot => {
        timeStr += ` | ${slot.country} (${slot.timezone}): ${slot.startTime} - ${slot.endTime}`;
      });
    }
    
    markdown += `${timeStr}  \n\n`;
  }
  
  // Meeting URLs
  if (mom.urls && mom.urls.length > 0) {
    markdown += `## Meeting URLs\n`;
    mom.urls.forEach((url, index) => {
      markdown += `${index + 1}. [${url}](${url})  \n`;
    });
    markdown += '\n';
  }
  
  // **Companies and Attendees 形式修正**
  // 以前の実装: CompaniesとAttendeesが別々のセクションで表示されていた
  // 問題点: 会社と参加者の関係が分かりにくく、冗長な表示になっていた
  // 解決策: 会社ごとに参加者をグループ化し、1行に「Company : Attendee1, Attendee2」形式で表示
  if (mom.companies.length > 0) {
    markdown += `## Companies and Attendees\n`;
    
    // 会社ごとに参加者をグループ化
    mom.companies.forEach(company => {
      // その会社に所属する参加者を取得
      const companyAttendees = mom.attendees.filter(attendee => attendee.companyId === company.id);
      
      if (companyAttendees.length > 0) {
        // **形式**: Company : Attendee1 , Attendee2
        const attendeeNames = companyAttendees.map(a => a.name).join(' , ');
        markdown += `${company.name} : ${attendeeNames}\n`;
      } else {
        // 参加者がいない会社も表示
        markdown += `${company.name} : (No attendees)\n`;
      }
    });
    
    markdown += '\n';
  }
  
  // Meeting Attachments
  if (mom.meetingAttachments && mom.meetingAttachments.length > 0) {
    markdown += `## Meeting Attachments\n\n`;
    mom.meetingAttachments.forEach((attachment, index) => {
      if (attachment.mimeType === 'text/url') {
        markdown += `${index + 1}. [${attachment.fileName}](${attachment.data})\n`;
      } else {
        markdown += `${index + 1}. ${attachment.fileName || 'Unnamed file'}`;
        if (attachment.fileSize && attachment.fileSize > 0) {
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(attachment.fileSize) / Math.log(k));
          const fileSize = parseFloat((attachment.fileSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
          markdown += ` (${fileSize})`;
        }
        markdown += '\n';
      }
    });
    markdown += '\n';
  }
  
  // **REVISION DIFFERENCES**: Add revision comparison section if revision > 0
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = 
      differences.titleChanged ||
      differences.goalChanged ||
      differences.dateChanged ||
      differences.companiesChanged ||
      differences.attendeesChanged ||
      differences.structureChanges.size > 0 ||
      differences.mainTimeSlotChanged ||
      differences.otherTimeSlotsChanged;

    if (hasChanges) {
      markdown += `## Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})\n\n`;
      
      if (differences.titleChanged) {
        markdown += `- **Meeting Title** changed\n`;
      }
      
      if (differences.goalChanged) {
        markdown += `- **Meeting Goal** changed\n`;
      }
      
      if (differences.dateChanged) {
        markdown += `- **Meeting Date** changed\n`;
      }
      
      if (differences.companiesChanged) {
        markdown += `- **Companies** modified\n`;
      }
      
      if (differences.attendeesChanged) {
        markdown += `- **Attendees** modified\n`;
      }
      
      if (differences.mainTimeSlotChanged) {
        markdown += `- **Main Time Slot** changed\n`;
      }
      
      if (differences.otherTimeSlotsChanged) {
        markdown += `- **Other Country Times** changed\n`;
      }
      
      if (differences.structureChanges.size > 0) {
        markdown += `- **${differences.structureChanges.size} Agenda Items** modified\n`;
      }
      
      markdown += '\n';
    }
  }
  
  // Structure
  if (mom.structure.length > 0) {
    markdown += `## Agenda\n\n`;
    // **階層番号生成**: 1., 1.1., 1.1.1. 形式の番号を生成
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    markdown += generateStructureMarkdown(numberedStructure, 0, currentRevision);
  }
  
  // Changes Summary
  if (mom.changesSummary) {
    markdown += `## Changes Summary\n${mom.changesSummary}\n\n`;
  }
  
  markdown += `---\n\n`;
  markdown += `*Generated on ${new Date().toLocaleString()}*`;
  
  return markdown;
}

/**
 * Generates markdown for structure items
 */
function generateStructureMarkdown(items: StructureItem[], level: number = 0, currentRevision?: number): string {
  let markdown = '';
  
  items.forEach(item => {
    const prefix = '#'.repeat(Math.min(level + 3, 6)); // H3 to H6
    // **HIERARCHICAL NUMBERING**: Add visual indicators for hierarchy
    const indent = '  '.repeat(level); // Add indentation
    const bullet = level > 0 ? '> ' : ''; // Add quote marker for sub-items
    
    // **HIERARCHICAL NUMBERING**: Use hierarchicalNumber if available
    const number = item.hierarchicalNumber || item.number;
    
    // **REVISION COLOR IN MARKDOWN**: Add revision indicator for modified items
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    // **SHOW ONLY TRANSLATIONS**: Hide original text, show only translations
    if (item.translations) {
      // All levels - show EN next to number, then JA and TH on separate lines
      if (isModified) {
        markdown += `${indent}${bullet}${prefix} **[${number}] ${item.translations.en} [Rev.${currentRevision}]**\n`;
      } else {
        markdown += `${indent}${bullet}${prefix} **[${number}] ${item.translations.en}**\n`;
      }
      markdown += `${indent}> JA: ${item.translations.ja}  \n`;
      markdown += `${indent}> TH: ${item.translations.th}  \n`;
    } else {
      // Fallback to original if no translations
      if (isModified) {
        markdown += `${indent}${bullet}${prefix} **[${number}] ${item.title} [Rev.${currentRevision}]**\n`;
      } else {
        markdown += `${indent}${bullet}${prefix} **[${number}]** ${item.title}\n`;
      }
    }
    markdown += `\n`;
    
    if (item.level === 4) {
      // Add action details
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        markdown += `**Responsible:** ${item.responsibleParties.map(p => p.name).join(', ')}  \n`;
      }
      if (item.dueDate) {
        markdown += `**Due Date:** ${item.dueDate}  \n`;
      }
      if (item.status) {
        if (item.status === 'open') {
          markdown += `**Status:** **\`${item.status.toUpperCase()}\`** ⚠️  \n`;
        } else {
          markdown += `**Status:** \`${item.status.toUpperCase()}\`  \n`;
        }
      }
      if (item.urls && item.urls.length > 0) {
        markdown += `**URLs:**\n`;
        item.urls.forEach((url, i) => {
          markdown += `${i + 1}. [${url}](${url})\n`;
        });
      }
      if (item.attachments && item.attachments.length > 0) {
        markdown += `**Attachments:** ${item.attachments.length} file(s)  \n`;
      }
      markdown += '\n';
    }
    
    if (item.children.length > 0) {
      markdown += '\n'; // Add extra line break before children
      markdown += generateStructureMarkdown(item.children, level + 1, currentRevision);
    }
  });
  
  return markdown;
}

/**
 * Adds structure items to PDF with support for images
 */
async function addStructureToPDF(
  pdf: jsPDF, 
  items: StructureItem[], 
  startY: number, 
  indent: number = 0
): Promise<number> {
  let yPosition = startY;
  
  for (const item of items) {
    // Check if we need a new page
    if (yPosition > 270) {
      pdf.addPage();
      yPosition = 20;
    }
    
    // Add item number and title
    pdf.setFontSize(11);
    // **HIERARCHICAL NUMBERING**: Use hierarchicalNumber if available
    const number = item.hierarchicalNumber || item.number;
    const itemText = `${' '.repeat(indent * 2)}${number}. ${item.title}`;
    pdf.text(itemText, 20 + indent * 5, yPosition);
    yPosition += 7;
    
    if (item.level === 4) {
      // Add action details
      pdf.setFontSize(10);
      
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        pdf.text(`Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`, 25 + indent * 5, yPosition);
        yPosition += 5;
      }
      
      if (item.dueDate) {
        pdf.text(`Due Date: ${item.dueDate}`, 25 + indent * 5, yPosition);
        yPosition += 5;
      }
      
      if (item.status) {
        pdf.text(`Status: ${item.status.toUpperCase()}`, 25 + indent * 5, yPosition);
        yPosition += 5;
      }
      
      if (item.urls && item.urls.length > 0) {
        pdf.text('URLs:', 25 + indent * 5, yPosition);
        yPosition += 5;
        item.urls.forEach(url => {
          const urlLines = pdf.splitTextToSize(`- ${url}`, 165 - indent * 5);
          urlLines.forEach((line: string) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(line, 30 + indent * 5, yPosition);
            yPosition += 5;
          });
        });
      }
      
      // **PDF IMAGE INCLUSION**: Add attached images to PDF
      if (item.attachments && item.attachments.length > 0) {
        pdf.text('Attachments:', 25 + indent * 5, yPosition);
        yPosition += 5;
        
        for (const attachment of item.attachments) {
          if (attachment.type === 'image' && attachment.data) {
            try {
              // Check if we have enough space for the image
              if (yPosition > 200) {
                pdf.addPage();
                yPosition = 20;
              }
              
              // Use annotated version if available, otherwise use original
              const imageData = attachment.annotations || attachment.data;
              
              // Add image to PDF (max width: 100mm, max height: 80mm)
              pdf.addImage(imageData, 'JPEG', 30 + indent * 5, yPosition, 100, 80, undefined, 'FAST');
              yPosition += 85;
            } catch (error) {
              console.error('Error adding image to PDF:', error);
              pdf.text('[Image could not be loaded]', 30 + indent * 5, yPosition);
              yPosition += 5;
            }
          }
        }
      }
      
      yPosition += 3;
    }
    
    // Process children
    if (item.children.length > 0) {
      yPosition = await addStructureToPDF(pdf, item.children, yPosition, indent + 1);
    }
  }
  
  return yPosition;
}

/**
 * Exports MOM to PDF format with image support
 * **PDF UTF-8 FIX**: Now delegates to the UTF-8 compatible implementation
 * **テキスト選択可能PDF修正**: html2canvasベースの実装からテキストベースの実装に変更
 * 以前の問題: PDFが画像として出力され、テキスト選択ができなかった
 * 解決策: jsPDFのテキストAPIを直接使用する新しい実装に切り替え
 * **UNICODE PDF FIX 2025-07-11**: 完全なUnicode対応実装に切り替え
 * 日本語、タイ語を含むすべてのUnicode文字が正しく表示され、選択可能になります
 * **COMPLETE FIX WITH PDF-LIB**: jsPDFからpdf-libに切り替えて完全なUnicode対応を実現
 * pdf-libは適切なフォント埋め込みとUnicodeテキストレンダリングをサポート
 * **FINAL FIX**: Noto Sansフォントを埋め込んで完全なUnicode対応を実現
 * **ROBUST FIX**: WinAnsiエンコーディングエラーを回避する安全な実装
 * **PDFMAKE IMPLEMENTATION**: pdfmakeを使用して完全なUnicode対応を実現
 */
export async function exportToPDF(mom: MOM): Promise<Blob> {
  // **2025-07-11 UNICODE PDFMAKE**: Use enhanced pdfmake with proper Unicode font support
  // This version includes embedded Noto Sans fonts for Japanese and Thai characters
  try {
    const { exportToPDFWithUnicode } = await import('./export-pdf-unicode-pdfmake');
    return await exportToPDFWithUnicode(mom);
  } catch (error) {
    console.warn('Failed to use Unicode pdfmake, falling back to standard pdfmake:', error);
    // Fallback to standard pdfmake
    try {
      const { exportToPDFWithPdfMake } = await import('./export-pdf-pdfmake');
      return await exportToPDFWithPdfMake(mom);
    } catch (fallbackError) {
      console.warn('Failed to use pdfmake, falling back to simple export:', fallbackError);
      // Final fallback to simple export
      const { exportToPDFSimple } = await import('./export-pdf-simple');
      return await exportToPDFSimple(mom);
    }
  }
}

/**
 * Legacy PDF export - kept for reference but not used
 */
async function exportToPDFLegacy(mom: MOM): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // **PDF UTF-8 FIX**: Use unicode text method for proper character encoding
  // This ensures Japanese, Thai, and other Unicode characters display correctly
  pdf.setFont('helvetica', 'normal');
  
  // Set font size
  pdf.setFontSize(20);
  // Use splitTextToSize to handle unicode properly
  const titleText = `MOM: ${mom.title}`;
  const titleLines = pdf.splitTextToSize(titleText, 170);
  pdf.text(titleLines, 20, 20);
  
  pdf.setFontSize(12);
  let yPosition = 35;
  
  // Metadata
  pdf.text(`MOM ID: ${mom.momId}`, 20, yPosition);
  yPosition += 7;
  pdf.text(`Revision: ${mom.revision}`, 20, yPosition);
  yPosition += 7;
  pdf.text(`Date: ${mom.date}`, 20, yPosition);
  yPosition += 7;
  pdf.text(`Status: ${mom.status}`, 20, yPosition);
  yPosition += 15;
  
  // Companies
  if (mom.companies.length > 0) {
    pdf.setFontSize(14);
    pdf.text('Companies:', 20, yPosition);
    yPosition += 7;
    pdf.setFontSize(11);
    mom.companies.forEach(company => {
      pdf.text(`• ${company.name}`, 25, yPosition);
      yPosition += 6;
    });
    yPosition += 5;
  }
  
  // Attendees
  if (mom.attendees.length > 0) {
    pdf.setFontSize(14);
    pdf.text('Attendees:', 20, yPosition);
    yPosition += 7;
    pdf.setFontSize(11);
    mom.attendees.forEach(attendee => {
      pdf.text(`• ${attendee.name} (${attendee.email})`, 25, yPosition);
      yPosition += 6;
      
      // Check if we need a new page
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
    });
    yPosition += 5;
  }
  
  // Structure with images
  if (mom.structure.length > 0) {
    pdf.setFontSize(14);
    pdf.text('Agenda:', 20, yPosition);
    yPosition += 10;
    
    // Use the new function that supports images
    yPosition = await addStructureToPDF(pdf, mom.structure, yPosition);
  }
  
  // Return as blob
  return pdf.output('blob');
}

/**
 * Downloads a file
 */
export function downloadFile(content: string | Blob, filename: string, type: string = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export MOM to Google Docs HTML format
 */
export function exportToGoogleDocs(mom: MOM): string {
  return exportToGoogleDocsHTML(mom);
}

// Re-export filename generators
export { generatePDFFilename, generateMarkdownFilename, generateGoogleDocsFilename };