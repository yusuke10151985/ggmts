// **TEXT SELECTABLE PDF IMPLEMENTATION**: Pure text-based PDF with Unicode support
// This implementation uses jsPDF with proper text rendering

import { MOM, StructureItem } from '@/types/mom';
import jsPDF from 'jspdf';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

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
 * Generate PDF filename
 */
export function generatePDFFilename(mom: MOM): string {
  const momId = mom.momId.replace(/^MOM-/, '');
  const revision = `Rev.${mom.revision}`;
  
  const enTitle = mom.titleTranslations?.en || 'Meeting';
  const jpTitle = mom.titleTranslations?.ja || '会議';
  const thTitle = mom.titleTranslations?.th || 'การประชุม';
  
  const cleanTitle = (title: string) => {
    return title.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  };
  
  return `${momId}_${revision}_${cleanTitle(enTitle)}_${cleanTitle(jpTitle)}_${cleanTitle(thTitle)}.pdf`;
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
 * Draw text with proper encoding
 */
function drawText(
  ctx: PDFContext,
  text: string,
  options?: {
    fontSize?: number;
    bold?: boolean;
    color?: string;
    indent?: number;
  }
): void {
  const fontSize = options?.fontSize || 10;
  const indent = options?.indent || 0;
  
  ctx.pdf.setFontSize(fontSize);
  
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
  
  // Split text into lines that fit within content width
  const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth - indent);
  
  lines.forEach((line: string) => {
    checkPageBreak(ctx, fontSize * 0.5);
    ctx.pdf.text(line, ctx.leftMargin + indent, ctx.y);
    ctx.y += fontSize * 0.5;
  });
  
  // Reset color
  if (options?.color) {
    ctx.pdf.setTextColor(0, 0, 0);
  }
}

/**
 * Draw paragraph with spacing
 */
function drawParagraph(
  ctx: PDFContext,
  text: string,
  options?: {
    fontSize?: number;
    bold?: boolean;
    color?: string;
    indent?: number;
    spacing?: number;
  }
): void {
  drawText(ctx, text, options);
  ctx.y += options?.spacing || 5;
}

/**
 * Draw label-value pair
 */
function drawLabelValue(
  ctx: PDFContext,
  label: string,
  value: string,
  fontSize: number = 10
): void {
  ctx.pdf.setFontSize(fontSize);
  ctx.pdf.setFont('helvetica', 'bold');
  const labelWidth = ctx.pdf.getTextWidth(label + ' ');
  ctx.pdf.text(label, ctx.leftMargin, ctx.y);
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.text(value, ctx.leftMargin + labelWidth, ctx.y);
  ctx.y += fontSize * 0.6;
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
    
    // Title with hierarchical number
    drawParagraph(ctx, `${item.number} ${item.title}`, {
      fontSize,
      bold: isModified || item.level <= 2,
      indent,
      spacing: 3
    });
    
    // Translations
    if (item.translations) {
      drawText(ctx, `EN: ${item.translations.en}`, {
        fontSize: 9,
        color: '#666666',
        indent: indent + 5
      });
      drawText(ctx, `JA: ${item.translations.ja}`, {
        fontSize: 9,
        color: '#666666',
        indent: indent + 5
      });
      drawText(ctx, `TH: ${item.translations.th}`, {
        fontSize: 9,
        color: '#666666',
        indent: indent + 5
      });
      ctx.y += 3;
    }
    
    // Level 4 items
    if (item.level === 4) {
      const detailIndent = indent + 10;
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        drawParagraph(ctx, `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`, {
          fontSize: 10,
          indent: detailIndent,
          spacing: 2
        });
      }
      
      if (item.dueDate) {
        drawParagraph(ctx, `Due Date: ${item.dueDate}`, {
          fontSize: 10,
          indent: detailIndent,
          spacing: 2
        });
      }
      
      if (item.status) {
        drawParagraph(ctx, `Status: ${item.status.toUpperCase()}`, {
          fontSize: 10,
          indent: detailIndent,
          bold: true,
          spacing: 2
        });
      }
      
      if (item.urls && item.urls.length > 0) {
        drawText(ctx, 'URLs:', {
          fontSize: 10,
          indent: detailIndent
        });
        item.urls.forEach(url => {
          drawText(ctx, `- ${url}`, {
            fontSize: 10,
            indent: detailIndent + 5,
            color: '#0066CC'
          });
        });
        ctx.y += 3;
      }
      
      if (item.attachments && item.attachments.length > 0) {
        drawParagraph(ctx, `[${item.attachments.length} attachment(s)]`, {
          fontSize: 10,
          indent: detailIndent,
          color: '#666666',
          spacing: 5
        });
      }
    }
    
    // Process children
    if (item.children && item.children.length > 0) {
      drawStructureItems(ctx, item.children, indentLevel + 1, currentRevision);
    }
  });
}

/**
 * Main export function
 */
export async function exportToPDFTextSelectable(mom: MOM): Promise<Blob> {
  // Create PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });
  
  // Set document properties
  pdf.setProperties({
    title: `${mom.momId}_Rev.${mom.revision}`,
    subject: mom.title,
    creator: 'MOM Manager',
    keywords: 'meeting,minutes,mom'
  });
  
  // Set up autoPrint to ensure text is selectable
  pdf.setDocumentProperties({
    title: `${mom.momId}_Rev.${mom.revision}`,
    subject: mom.title,
    author: 'MOM Manager',
    keywords: 'meeting,minutes,mom',
    creator: 'MOM Manager'
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
  
  // Title
  drawParagraph(ctx, `MOM: ${mom.title}`, {
    fontSize: 18,
    bold: true,
    spacing: 5
  });
  
  // Title translations
  if (mom.titleTranslations) {
    drawText(ctx, `EN: ${mom.titleTranslations.en}`, {
      fontSize: 10,
      color: '#666666'
    });
    drawText(ctx, `JA: ${mom.titleTranslations.ja}`, {
      fontSize: 10,
      color: '#666666'
    });
    drawText(ctx, `TH: ${mom.titleTranslations.th}`, {
      fontSize: 10,
      color: '#666666'
    });
    ctx.y += 10;
  }
  
  // Meeting Goal
  if (mom.goal) {
    drawParagraph(ctx, 'Meeting Goal:', {
      fontSize: 12,
      bold: true,
      spacing: 2
    });
    drawParagraph(ctx, mom.goal, {
      fontSize: 11,
      indent: 5,
      spacing: 3
    });
    
    if (mom.goalTranslations) {
      drawText(ctx, `EN: ${mom.goalTranslations.en}`, {
        fontSize: 9,
        color: '#666666',
        indent: 5
      });
      drawText(ctx, `JA: ${mom.goalTranslations.ja}`, {
        fontSize: 9,
        color: '#666666',
        indent: 5
      });
      drawText(ctx, `TH: ${mom.goalTranslations.th}`, {
        fontSize: 9,
        color: '#666666',
        indent: 5
      });
      ctx.y += 10;
    }
  }
  
  // Metadata
  drawLabelValue(ctx, 'MOM ID: ', mom.momId);
  drawLabelValue(ctx, 'Revision: ', mom.revision.toString());
  drawLabelValue(ctx, 'Date: ', mom.date);
  drawLabelValue(ctx, 'Status: ', mom.status);
  ctx.y += 5;
  
  // Companies and Attendees
  if (mom.companies.length > 0) {
    drawParagraph(ctx, 'Companies and Attendees:', {
      fontSize: 14,
      bold: true,
      spacing: 5
    });
    
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      drawParagraph(ctx, `${company.name} : ${attendeeNames}`, {
        fontSize: 11,
        indent: 5,
        spacing: 3
      });
    });
    ctx.y += 5;
  }
  
  // Revision comparison
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = differences.titleChanged || differences.goalChanged ||
      differences.dateChanged || differences.companiesChanged ||
      differences.attendeesChanged || differences.structureChanges.size > 0 ||
      differences.mainTimeSlotChanged || differences.otherTimeSlotsChanged;
    
    if (hasChanges) {
      drawParagraph(ctx, `Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})`, {
        fontSize: 14,
        bold: true,
        spacing: 5
      });
      
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
        drawParagraph(ctx, `• ${change}`, {
          fontSize: 11,
          indent: 5,
          bold: true,
          spacing: 3
        });
      });
      ctx.y += 5;
    }
  }
  
  // Agenda
  if (mom.structure.length > 0) {
    drawParagraph(ctx, 'Agenda:', {
      fontSize: 14,
      bold: true,
      spacing: 5
    });
    
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    drawStructureItems(ctx, numberedStructure, 0, mom.revision);
  }
  
  // Add attachment images
  const numberedStructure = generateHierarchicalNumbers(mom.structure);
  
  const processItems = async (items: StructureItem[]): Promise<void> => {
    for (const item of items) {
      if (item.attachments && item.attachments.length > 0) {
        for (const attachment of item.attachments) {
          if (attachment.type === 'image' && attachment.data) {
            try {
              ctx.pdf.addPage();
              ctx.y = 20;
              
              drawParagraph(ctx, `Attachment for: ${item.number}. ${item.title}`, {
                fontSize: 12,
                bold: true,
                spacing: 10
              });
              
              const imageData = attachment.annotations || attachment.data;
              ctx.pdf.addImage(imageData, 'JPEG', 20, ctx.y, 170, 120, undefined, 'FAST');
            } catch (error) {
              console.error('Error adding attachment image:', error);
            }
          }
        }
      }
      
      if (item.children && item.children.length > 0) {
        await processItems(item.children);
      }
    }
  };
  
  await processItems(numberedStructure);
  
  return pdf.output('blob');
}