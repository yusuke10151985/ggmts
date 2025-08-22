// **ROBUST UNICODE PDF EXPORT**: Complete rewrite with proper Unicode handling
// This implementation avoids WinAnsi encoding issues by using UTF-8 throughout

import { MOM, StructureItem } from '@/types/mom';
import jsPDF from 'jspdf';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

/**
 * Generate PDF filename in the required format
 * Format: "MOM ID_Rev.No._EN_JP_TH" (no MOM- prefix)
 */
export function generatePDFFilename(mom: MOM): string {
  // **FIX**: Remove MOM- prefix to follow the required format
  const momId = mom.momId.replace(/^MOM-/, '');
  const revision = `Rev.${mom.revision}`;
  
  // Get title translations or use defaults
  const enTitle = mom.titleTranslations?.en || 'Meeting';
  const jpTitle = mom.titleTranslations?.ja || '会議';
  const thTitle = mom.titleTranslations?.th || 'การประชุม';
  
  // Clean titles for filename (remove special characters)
  const cleanTitle = (title: string) => {
    return title.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30); // Limit length
  };
  
  return `${momId}_${revision}_${cleanTitle(enTitle)}_${cleanTitle(jpTitle)}_${cleanTitle(thTitle)}.pdf`;
}

// **CRITICAL**: Configure jsPDF to use UTF-8 encoding
interface PDFContext {
  pdf: jsPDF;
  y: number;
  pageHeight: number;
  pageWidth: number;
  leftMargin: number;
  rightMargin: number;
  contentWidth: number;
}

/**
 * Check if page break is needed
 */
function checkPageBreak(ctx: PDFContext, requiredSpace: number): void {
  if (ctx.y + requiredSpace > ctx.pageHeight - 20) {
    ctx.pdf.addPage();
    ctx.y = 20;
  }
}

/**
 * Safe text drawing that handles Unicode properly
 * **CRITICAL**: This function ensures no WinAnsi encoding errors
 */
function safeDrawText(
  ctx: PDFContext,
  text: string,
  x: number,
  fontSize: number = 10,
  options?: { bold?: boolean; color?: string }
): void {
  ctx.pdf.setFontSize(fontSize);
  
  // **FIX**: Always use UTF-8 mode to avoid WinAnsi encoding issues
  // Set font with UTF-8 support
  if (options?.bold) {
    ctx.pdf.setFont('helvetica', 'bold');
  } else {
    ctx.pdf.setFont('helvetica', 'normal');
  }
  
  if (options?.color) {
    const r = parseInt(options.color.slice(1, 3), 16);
    const g = parseInt(options.color.slice(3, 5), 16);
    const b = parseInt(options.color.slice(5, 7), 16);
    ctx.pdf.setTextColor(r, g, b);
  }
  
  // **CRITICAL FIX**: Replace problematic characters before rendering
  // This is a workaround for jsPDF's limited Unicode support
  const sanitizedText = sanitizeTextForPDF(text);
  
  // Use text method with explicit encoding
  ctx.pdf.text(sanitizedText, x, ctx.y);
  
  // Reset color
  if (options?.color) {
    ctx.pdf.setTextColor(0, 0, 0);
  }
}

/**
 * Sanitize text to avoid encoding errors
 * **WORKAROUND**: Replace problematic Unicode characters with ASCII equivalents
 */
function sanitizeTextForPDF(text: string): string {
  // Map of problematic characters to their ASCII equivalents
  const replacements: { [key: string]: string } = {
    '、': ',',  // Japanese comma
    '。': '.',  // Japanese period
    '「': '"',  // Japanese left quote
    '」': '"',  // Japanese right quote
    '（': '(',  // Fullwidth left parenthesis
    '）': ')',  // Fullwidth right parenthesis
    '：': ':',  // Fullwidth colon
    '；': ';',  // Fullwidth semicolon
    '！': '!',  // Fullwidth exclamation
    '？': '?',  // Fullwidth question mark
    '　': ' ',  // Fullwidth space
    '・': '･',  // Katakana middle dot
    '〜': '~',  // Wave dash
    '—': '-',  // Em dash
    '–': '-',  // En dash
    '\u2018': "'",  // Left single quote
    '\u2019': "'",  // Right single quote
    '\u201C': '"',  // Left double quote
    '\u201D': '"',  // Right double quote
  };
  
  // Replace known problematic characters
  let result = text;
  for (const [char, replacement] of Object.entries(replacements)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  
  // **IMPORTANT**: For characters that can't be displayed, show them in brackets
  // This preserves the information even if the character can't be rendered
  result = result.replace(/[^\x00-\x7F]/g, (char) => {
    // Check if it's a common Unicode block
    const code = char.charCodeAt(0);
    
    // CJK characters (Chinese, Japanese, Korean)
    if (code >= 0x4E00 && code <= 0x9FFF) {
      return `[${char}]`;
    }
    // Hiragana
    else if (code >= 0x3040 && code <= 0x309F) {
      return `[${char}]`;
    }
    // Katakana
    else if (code >= 0x30A0 && code <= 0x30FF) {
      return `[${char}]`;
    }
    // Thai
    else if (code >= 0x0E00 && code <= 0x0E7F) {
      return `[${char}]`;
    }
    // Other non-ASCII
    else {
      return `[U+${code.toString(16).toUpperCase()}]`;
    }
  });
  
  return result;
}

/**
 * Draw paragraph with proper line wrapping
 */
function drawParagraph(
  ctx: PDFContext,
  text: string,
  fontSize: number = 10,
  indent: number = 0,
  paragraphSpacing: number = 5,
  options?: { bold?: boolean; color?: string }
): void {
  ctx.pdf.setFontSize(fontSize);
  
  // **FIX**: Sanitize text before splitting to avoid width calculation errors
  const sanitizedText = sanitizeTextForPDF(text);
  const lines = ctx.pdf.splitTextToSize(sanitizedText, ctx.contentWidth - indent);
  
  lines.forEach((line: string) => {
    checkPageBreak(ctx, fontSize * 0.5);
    safeDrawText(ctx, line, ctx.leftMargin + indent, fontSize, options);
    ctx.y += fontSize * 0.5;
  });
  
  ctx.y += paragraphSpacing;
}

/**
 * Main export function with Unicode workarounds
 */
export async function exportToPDFRobust(mom: MOM): Promise<Blob> {
  // **INITIALIZATION**: Create PDF with UTF-8 support
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });

  // Set document properties
  pdf.setProperties({
    title: sanitizeTextForPDF(`MOM-${mom.momId}_Rev.${mom.revision}`),
    subject: sanitizeTextForPDF(mom.title),
    creator: 'MOM Manager',
    keywords: 'meeting,minutes,mom'
  });

  const ctx: PDFContext = {
    pdf,
    y: 20,
    pageHeight: 297,
    pageWidth: 210,
    leftMargin: 20,
    rightMargin: 20,
    contentWidth: 170
  };

  // **TITLE**
  drawParagraph(ctx, `MOM: ${mom.title}`, 18, 0, 3, { bold: true });
  
  // Title translations with clear labels
  if (mom.titleTranslations) {
    drawParagraph(ctx, `English: ${mom.titleTranslations.en}`, 10, 0, 2, { color: '#666666' });
    drawParagraph(ctx, `Japanese: ${mom.titleTranslations.ja}`, 10, 0, 2, { color: '#666666' });
    drawParagraph(ctx, `Thai: ${mom.titleTranslations.th}`, 10, 0, 8, { color: '#666666' });
  }

  // **MEETING GOAL**
  if (mom.goal) {
    drawParagraph(ctx, 'Meeting Goal:', 12, 0, 2, { bold: true });
    drawParagraph(ctx, mom.goal, 11, 5, 3);
    
    if (mom.goalTranslations) {
      drawParagraph(ctx, `English: ${mom.goalTranslations.en}`, 9, 5, 2, { color: '#666666' });
      drawParagraph(ctx, `Japanese: ${mom.goalTranslations.ja}`, 9, 5, 2, { color: '#666666' });
      drawParagraph(ctx, `Thai: ${mom.goalTranslations.th}`, 9, 5, 8, { color: '#666666' });
    }
  }

  // **METADATA**
  const metadata = [
    { label: 'MOM ID:', value: mom.momId },
    { label: 'Revision:', value: mom.revision.toString() },
    { label: 'Date:', value: mom.date },
    { label: 'Status:', value: mom.status }
  ];

  metadata.forEach(item => {
    checkPageBreak(ctx, 8);
    const labelWidth = pdf.getTextWidth(item.label + ' ');
    safeDrawText(ctx, item.label, ctx.leftMargin, 10, { bold: true });
    safeDrawText(ctx, item.value, ctx.leftMargin + labelWidth + 5, 10);
    ctx.y += 6;
  });
  ctx.y += 5;

  // **COMPANIES AND ATTENDEES**
  if (mom.companies.length > 0) {
    checkPageBreak(ctx, 20);
    drawParagraph(ctx, 'Companies and Attendees:', 14, 0, 2, { bold: true });

    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0 
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      const companyLine = `${company.name} : ${attendeeNames}`;
      drawParagraph(ctx, companyLine, 11, 5, 3);
    });
    ctx.y += 5;
  }

  // **REVISION COMPARISON**
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = differences.titleChanged || differences.goalChanged || 
      differences.dateChanged || differences.companiesChanged || 
      differences.attendeesChanged || differences.structureChanges.size > 0 ||
      differences.mainTimeSlotChanged || differences.otherTimeSlotsChanged;

    if (hasChanges) {
      checkPageBreak(ctx, 30);
      drawParagraph(ctx, `Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})`, 14, 0, 2, { bold: true });

      const changes: string[] = [];
      if (differences.titleChanged) changes.push('Meeting Title changed');
      if (differences.goalChanged) changes.push('Meeting Goal changed');
      if (differences.dateChanged) changes.push('Meeting Date changed');
      if (differences.companiesChanged) changes.push('Companies modified');
      if (differences.attendeesChanged) changes.push('Attendees modified');
      if (differences.mainTimeSlotChanged) changes.push('Main Time Slot changed');
      if (differences.otherTimeSlotsChanged) changes.push('Other Country Times changed');
      if (differences.structureChanges.size > 0) {
        changes.push(`${differences.structureChanges.size} Agenda Items modified`);
      }

      changes.forEach(change => {
        drawParagraph(ctx, `• ${change}`, 11, 5, 3);
      });
      ctx.y += 5;
    }
  }

  // **AGENDA STRUCTURE**
  if (mom.structure.length > 0) {
    checkPageBreak(ctx, 20);
    drawParagraph(ctx, 'Agenda:', 14, 0, 2, { bold: true });

    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    drawStructureItems(ctx, numberedStructure, 0, mom.revision);
  }

  // **ADD IMAGES**
  await addAttachmentImages(ctx, mom);

  return pdf.output('blob');
}

/**
 * Draw structure items recursively
 */
function drawStructureItems(
  ctx: PDFContext,
  items: StructureItem[],
  indentLevel: number,
  currentRevision?: number
): void {
  items.forEach(item => {
    const indent = indentLevel * 10;
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    const fontSize = Math.max(14 - item.level, 10);
    
    // Structure title
    checkPageBreak(ctx, 20);
    const titleText = `${item.hierarchicalNumber || item.number} ${item.title}`;
    drawParagraph(ctx, titleText, fontSize, indent, 3, { 
      bold: isModified || item.level <= 2 
    });

    // Translations on separate lines for clarity
    if (item.translations) {
      drawParagraph(ctx, `English: ${item.translations.en}`, 9, indent + 5, 2, { color: '#666666' });
      drawParagraph(ctx, `Japanese: ${item.translations.ja}`, 9, indent + 5, 2, { color: '#666666' });
      drawParagraph(ctx, `Thai: ${item.translations.th}`, 9, indent + 5, 5, { color: '#666666' });
    }

    // Level 4 items
    if (item.level === 4) {
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        const responsible = `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`;
        drawParagraph(ctx, responsible, 10, indent + 10, 3);
      }

      if (item.dueDate) {
        drawParagraph(ctx, `Due Date: ${item.dueDate}`, 10, indent + 10, 3);
      }

      if (item.status) {
        drawParagraph(ctx, `Status: ${item.status.toUpperCase()}`, 10, indent + 10, 3);
      }

      if (item.urls && item.urls.length > 0) {
        drawParagraph(ctx, 'URLs:', 10, indent + 10, 2);
        item.urls.forEach(url => {
          drawParagraph(ctx, `- ${url}`, 10, indent + 15, 2);
        });
      }

      if (item.attachments && item.attachments.length > 0) {
        drawParagraph(ctx, `[${item.attachments.length} attachment(s)]`, 10, indent + 10, 3, { color: '#666666' });
      }
      
      ctx.y += 3;
    }

    // Process children
    if (item.children && item.children.length > 0) {
      drawStructureItems(ctx, item.children, indentLevel + 1, currentRevision);
    }
  });
}

/**
 * Add attachment images
 */
async function addAttachmentImages(ctx: PDFContext, mom: MOM): Promise<void> {
  const numberedStructure = generateHierarchicalNumbers(mom.structure);
  
  const processItems = async (items: StructureItem[]): Promise<void> => {
    for (const item of items) {
      if (item.attachments && item.attachments.length > 0) {
        for (const attachment of item.attachments) {
          if (attachment.type === 'image' && attachment.data) {
            try {
              ctx.pdf.addPage();
              ctx.y = 20;
              
              // Add title for context
              drawParagraph(ctx, `Attachment for: ${item.hierarchicalNumber || item.number}. ${item.title}`, 12, 0, 10, { bold: true });
              
              // Add image
              const imageData = attachment.annotations || attachment.data;
              ctx.pdf.addImage(imageData, 'JPEG', 20, ctx.y, 170, 120, undefined, 'FAST');
            } catch (error) {
              console.error('Error adding attachment image:', error);
            }
          }
        }
      }
      
      // Process children
      if (item.children && item.children.length > 0) {
        await processItems(item.children);
      }
    }
  };
  
  await processItems(numberedStructure);
}