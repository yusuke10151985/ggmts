// **SIMPLIFIED PDF EXPORT WITH BETTER UNICODE SUPPORT**
// This implementation uses a simpler approach with better fallbacks

import { MOM, StructureItem } from '@/types/mom';
import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

interface PDFContext {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
  pageHeight: number;
  pageWidth: number;
  leftMargin: number;
  rightMargin: number;
  contentWidth: number;
  lineHeight: number;
}

/**
 * Convert Unicode text to a safer representation
 */
function unicodeToSafeText(text: string): string {
  if (!text) return '';
  
  // Keep ASCII and common Latin characters
  let safeText = text.replace(/[^\x00-\xFF]/g, (char) => {
    const code = char.charCodeAt(0);
    
    // Japanese Hiragana
    if (code >= 0x3040 && code <= 0x309F) {
      return `[JA:${char}]`;
    }
    // Japanese Katakana
    else if (code >= 0x30A0 && code <= 0x30FF) {
      return `[JA:${char}]`;
    }
    // CJK Unified Ideographs (Kanji)
    else if (code >= 0x4E00 && code <= 0x9FFF) {
      return `[JA:${char}]`;
    }
    // Thai
    else if (code >= 0x0E00 && code <= 0x0E7F) {
      return `[TH:${char}]`;
    }
    // Other
    else {
      return `[U+${code.toString(16).toUpperCase()}]`;
    }
  });
  
  return safeText;
}

/**
 * Check if page break is needed
 */
function checkPageBreak(ctx: PDFContext, requiredSpace: number): void {
  if (ctx.y - requiredSpace < 50) {
    ctx.page = ctx.doc.addPage();
    ctx.y = ctx.pageHeight - 50;
  }
}

/**
 * Draw text with line wrapping
 */
function drawText(
  ctx: PDFContext,
  text: string,
  options?: {
    fontSize?: number;
    bold?: boolean;
    color?: { r: number; g: number; b: number };
    indent?: number;
    lineSpacing?: number;
    preserveUnicode?: boolean;
  }
): void {
  const fontSize = options?.fontSize || 10;
  const indent = options?.indent || 0;
  const lineSpacing = options?.lineSpacing || 1.2;
  const color = options?.color || { r: 0, g: 0, b: 0 };
  const font = options?.bold ? ctx.boldFont : ctx.font;
  
  // Always convert text to safe representation to avoid encoding errors
  const displayText = unicodeToSafeText(text || '');
  
  // Split text for line wrapping
  const words = displayText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > ctx.contentWidth - indent && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Draw each line
  const lineHeight = fontSize * lineSpacing;
  
  lines.forEach(line => {
    checkPageBreak(ctx, lineHeight);
    
    ctx.page.drawText(line, {
      x: ctx.leftMargin + indent,
      y: ctx.y,
      size: fontSize,
      font: font,
      color: rgb(color.r, color.g, color.b)
    });
    
    ctx.y -= lineHeight;
  });
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
    color?: { r: number; g: number; b: number };
    indent?: number;
    paragraphSpacing?: number;
    preserveUnicode?: boolean;
  }
): void {
  drawText(ctx, text, options);
  ctx.y -= options?.paragraphSpacing || 5;
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
    // ASCII文字のみを使用してファイル名を生成（日本語・タイ語は除外）
    return title.replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  };
  
  // 日本語とタイ語のタイトルはエンコーディング問題を避けるため、短縮形を使用
  const jpShort = jpTitle.length > 0 ? 'JP' : '';
  const thShort = thTitle.length > 0 ? 'TH' : '';
  
  return `${momId}_${revision}_${cleanTitle(enTitle)}${jpShort ? '_' + jpShort : ''}${thShort ? '_' + thShort : ''}.pdf`;
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
    const indent = indentLevel * 15;
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    const fontSize = Math.max(14 - item.level, 10);
    
    // Title with number
    drawParagraph(ctx, `${item.number} ${item.title}`, {
      fontSize,
      bold: isModified || item.level <= 2,
      indent,
      paragraphSpacing: 3
    });
    
    // Translations
    if (item.translations) {
      drawText(ctx, `EN: ${item.translations.en}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: indent + 10
      });
      drawText(ctx, `JA: ${item.translations.ja}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: indent + 10
      });
      drawText(ctx, `TH: ${item.translations.th}`, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 },
        indent: indent + 10
      });
      ctx.y -= 5;
    }
    
    // Level 4 items
    if (item.level === 4) {
      const detailIndent = indent + 15;
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        drawParagraph(ctx, `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`, {
          fontSize: 10,
          indent: detailIndent,
          paragraphSpacing: 3
        });
      }
      
      if (item.dueDate) {
        drawParagraph(ctx, `Due Date: ${item.dueDate}`, {
          fontSize: 10,
          indent: detailIndent,
          paragraphSpacing: 3
        });
      }
      
      if (item.status) {
        drawParagraph(ctx, `Status: ${item.status.toUpperCase()}`, {
          fontSize: 10,
          indent: detailIndent,
          bold: true,
          paragraphSpacing: 3
        });
      }
      
      if (item.urls && item.urls.length > 0) {
        drawText(ctx, 'URLs:', {
          fontSize: 10,
          indent: detailIndent
        });
        item.urls.forEach(url => {
          drawText(ctx, `- ${url}`, {
            fontSize: 8,  // URLは2pt小さいフォントサイズ
            indent: detailIndent + 10,
            color: { r: 0, g: 0.4, b: 0.8 }
          });
        });
        ctx.y -= 5;
      }
      
      if (item.attachments && item.attachments.length > 0) {
        drawParagraph(ctx, `[${item.attachments.length} attachment(s)]`, {
          fontSize: 10,
          indent: detailIndent,
          color: { r: 0.4, g: 0.4, b: 0.4 },
          paragraphSpacing: 8
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
export async function exportToPDFSimple(mom: MOM): Promise<Blob> {
  try {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Use standard fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Set document metadata
    pdfDoc.setTitle(`${mom.momId}_Rev.${mom.revision}`);
    pdfDoc.setSubject(unicodeToSafeText(mom.title));
    pdfDoc.setAuthor('MOM Manager');
    pdfDoc.setProducer('MOM Manager - Simple Edition');
    pdfDoc.setCreator('MOM Manager');
    pdfDoc.setCreationDate(new Date());
    
    // Create first page
    const firstPage = pdfDoc.addPage();
    const { width, height } = firstPage.getSize();
    
    // Initialize context
    const ctx: PDFContext = {
      doc: pdfDoc,
      page: firstPage,
      font: helvetica,
      boldFont: helveticaBold,
      y: height - 50,
      pageHeight: height,
      pageWidth: width,
      leftMargin: 50,
      rightMargin: 50,
      contentWidth: width - 100,
      lineHeight: 12
    };
    
    // Title
    drawParagraph(ctx, `MOM: ${mom.title}`, {
      fontSize: 18,
      bold: true,
      paragraphSpacing: 8
    });
    
    // Title translations
    if (mom.titleTranslations) {
      drawText(ctx, `EN: ${mom.titleTranslations.en}`, {
        fontSize: 10,
        color: { r: 0.4, g: 0.4, b: 0.4 }
      });
      drawText(ctx, `JA: ${mom.titleTranslations.ja}`, {
        fontSize: 10,
        color: { r: 0.4, g: 0.4, b: 0.4 }
      });
      drawText(ctx, `TH: ${mom.titleTranslations.th}`, {
        fontSize: 10,
        color: { r: 0.4, g: 0.4, b: 0.4 }
      });
      ctx.y -= 15;
    }
    
    // Meeting Goal
    if (mom.goal) {
      drawParagraph(ctx, 'Meeting Goal:', {
        fontSize: 12,
        bold: true,
        paragraphSpacing: 3
      });
      drawParagraph(ctx, mom.goal, {
        fontSize: 11,
        indent: 10,
        paragraphSpacing: 5
      });
      
      if (mom.goalTranslations) {
        drawText(ctx, `EN: ${mom.goalTranslations.en}`, {
          fontSize: 9,
          color: { r: 0.4, g: 0.4, b: 0.4 },
          indent: 10
        });
        drawText(ctx, `JA: ${mom.goalTranslations.ja}`, {
          fontSize: 9,
          color: { r: 0.4, g: 0.4, b: 0.4 },
          indent: 10
        });
        drawText(ctx, `TH: ${mom.goalTranslations.th}`, {
          fontSize: 9,
          color: { r: 0.4, g: 0.4, b: 0.4 },
          indent: 10
        });
        ctx.y -= 15;
      }
    }
    
    // Metadata
    const metadata = [
      { label: 'MOM ID: ', value: mom.momId },
      { label: 'Revision: ', value: mom.revision.toString() },
      { label: 'Date: ', value: mom.date },
      { label: 'Status: ', value: mom.status }
    ];
    
    metadata.forEach(item => {
      checkPageBreak(ctx, 15);
      
      const fontSize = 10;
      const labelWidth = ctx.boldFont.widthOfTextAtSize(item.label, fontSize);
      
      ctx.page.drawText(item.label, {
        x: ctx.leftMargin,
        y: ctx.y,
        size: fontSize,
        font: ctx.boldFont,
        color: rgb(0, 0, 0)
      });
      
      ctx.page.drawText(item.value, {
        x: ctx.leftMargin + labelWidth,
        y: ctx.y,
        size: fontSize,
        font: ctx.font,
        color: rgb(0, 0, 0)
      });
      
      ctx.y -= 15;
    });
    ctx.y -= 10;
    
    // Companies and Attendees
    if (mom.companies.length > 0) {
      drawParagraph(ctx, 'Companies and Attendees:', {
        fontSize: 14,
        bold: true,
        paragraphSpacing: 8
      });
      
      mom.companies.forEach(company => {
        const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
        const attendeeNames = companyAttendees.length > 0
          ? companyAttendees.map(a => a.name).join(' , ')
          : '(No attendees)';
        
        drawParagraph(ctx, `${company.name} : ${attendeeNames}`, {
          fontSize: 11,
          indent: 10,
          paragraphSpacing: 5
        });
      });
      ctx.y -= 10;
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
          paragraphSpacing: 8
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
            indent: 10,
            bold: true,
            paragraphSpacing: 5
          });
        });
        ctx.y -= 10;
      }
    }
    
    // Agenda
    if (mom.structure.length > 0) {
      drawParagraph(ctx, 'Agenda:', {
        fontSize: 14,
        bold: true,
        paragraphSpacing: 8
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
                ctx.page = ctx.doc.addPage();
                ctx.y = ctx.pageHeight - 50;
                
                drawParagraph(ctx, `Attachment for: ${item.number}. ${item.title}`, {
                  fontSize: 12,
                  bold: true,
                  paragraphSpacing: 15
                });
                
                const imageData = attachment.annotations || attachment.data;
                const image = await ctx.doc.embedJpg(imageData);
                const { width: imgWidth, height: imgHeight } = image.size();
                
                // Calculate scaled dimensions
                const maxWidth = 500;
                const maxHeight = 600;
                let scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
                
                const scaledWidth = imgWidth * scale;
                const scaledHeight = imgHeight * scale;
                
                ctx.page.drawImage(image, {
                  x: ctx.leftMargin,
                  y: ctx.y - scaledHeight,
                  width: scaledWidth,
                  height: scaledHeight
                });
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
    
    // Save PDF
    console.log('Generating PDF...');
    const pdfBytes = await pdfDoc.save();
    
    return new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}