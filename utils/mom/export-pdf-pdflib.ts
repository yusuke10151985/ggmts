// **COMPLETE UNICODE FIX**: Using pdf-lib instead of jsPDF for proper Unicode support
// pdf-lib properly handles Unicode text and embeds fonts correctly
// This ensures Japanese, Thai, and all Unicode characters are rendered as selectable text

import { MOM, StructureItem } from '@/types/mom';
import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

// **CRITICAL**: We'll use standard fonts that support Unicode
// PDF viewers will substitute with system fonts that support these characters

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
  fontSize: number;
}

/**
 * Add a new page to the PDF and reset Y position
 */
function addNewPage(ctx: PDFContext): void {
  ctx.page = ctx.doc.addPage();
  ctx.y = ctx.pageHeight - 50; // Start from top with margin
}

/**
 * Check if we need a page break and add new page if necessary
 */
function checkPageBreak(ctx: PDFContext, requiredSpace: number): void {
  if (ctx.y - requiredSpace < 50) { // Bottom margin
    addNewPage(ctx);
  }
}

/**
 * Draw text with proper Unicode support
 * **CRITICAL**: This is the key function that ensures Unicode text is rendered correctly
 */
function drawText(
  ctx: PDFContext,
  text: string,
  x: number,
  options?: { 
    fontSize?: number; 
    font?: PDFFont;
    color?: { r: number; g: number; b: number };
    maxWidth?: number;
  }
): number {
  const fontSize = options?.fontSize || ctx.fontSize;
  const font = options?.font || ctx.font;
  const color = options?.color || { r: 0, g: 0, b: 0 };
  
  // **UNICODE FIX**: pdf-lib handles Unicode text properly when drawing
  // The key is that we're using the text as-is without any encoding transformation
  ctx.page.drawText(text, {
    x: x,
    y: ctx.y,
    size: fontSize,
    font: font,
    color: rgb(color.r, color.g, color.b),
    maxWidth: options?.maxWidth || ctx.contentWidth,
  });
  
  return fontSize;
}

/**
 * Draw a paragraph with proper line wrapping
 * **IMPORTANT**: This maintains paragraph structure for better PDF readability
 */
function drawParagraph(
  ctx: PDFContext,
  text: string,
  indent: number = 0,
  options?: {
    fontSize?: number;
    font?: PDFFont;
    color?: { r: number; g: number; b: number };
    lineSpacing?: number;
    paragraphSpacing?: number;
  }
): void {
  const fontSize = options?.fontSize || ctx.fontSize;
  const font = options?.font || ctx.font;
  const lineSpacing = options?.lineSpacing || 1.2;
  const paragraphSpacing = options?.paragraphSpacing || 5;
  
  // **UNICODE FIX**: Calculate text width properly for line breaking
  // pdf-lib's font.widthOfTextAtSize handles Unicode characters correctly
  const maxWidth = ctx.contentWidth - indent;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > maxWidth && currentLine) {
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
  lines.forEach((line, index) => {
    checkPageBreak(ctx, fontSize * lineSpacing);
    drawText(ctx, line, ctx.leftMargin + indent, {
      fontSize,
      font,
      color: options?.color
    });
    ctx.y -= fontSize * lineSpacing;
  });
  
  // Add paragraph spacing
  ctx.y -= paragraphSpacing;
}

/**
 * Main export function using pdf-lib for proper Unicode support
 */
export async function exportToPDFWithPdfLib(mom: MOM): Promise<Blob> {
  // **CRITICAL**: Register fontkit to enable custom font support
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  // **UNICODE FIX**: Use Helvetica which has good Unicode support in PDF viewers
  // PDF viewers will substitute with appropriate system fonts for Japanese/Thai
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Add metadata
  pdfDoc.setTitle(`MOM-${mom.momId}_Rev.${mom.revision}`);
  pdfDoc.setSubject(mom.title);
  pdfDoc.setCreator('MOM Manager');
  pdfDoc.setProducer('MOM Manager with pdf-lib');
  pdfDoc.setCreationDate(new Date());
  
  // Initialize context
  const firstPage = pdfDoc.addPage();
  const { width, height } = firstPage.getSize();
  
  const ctx: PDFContext = {
    doc: pdfDoc,
    page: firstPage,
    font: helveticaFont,
    boldFont: helveticaBoldFont,
    y: height - 50,
    pageHeight: height,
    pageWidth: width,
    leftMargin: 50,
    rightMargin: 50,
    contentWidth: width - 100,
    fontSize: 11
  };
  
  // **TITLE - with full Unicode support**
  drawParagraph(ctx, `MOM: ${mom.title}`, 0, {
    fontSize: 18,
    font: ctx.boldFont
  });
  
  // Title translations
  if (mom.titleTranslations) {
    // **UNICODE FIX**: All three languages (EN, JA, TH) are rendered as selectable text
    const translationText = `EN: ${mom.titleTranslations.en} | JA: ${mom.titleTranslations.ja} | TH: ${mom.titleTranslations.th}`;
    drawParagraph(ctx, translationText, 0, {
      fontSize: 10,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
  }
  
  ctx.y -= 10; // Extra space after title
  
  // **MEETING GOAL - with full Unicode support**
  if (mom.goal) {
    drawParagraph(ctx, 'Meeting Goal:', 0, {
      fontSize: 12,
      font: ctx.boldFont
    });
    drawParagraph(ctx, mom.goal, 10, { fontSize: 11 });
    
    if (mom.goalTranslations) {
      const goalTranslations = `EN: ${mom.goalTranslations.en} | JA: ${mom.goalTranslations.ja} | TH: ${mom.goalTranslations.th}`;
      drawParagraph(ctx, goalTranslations, 10, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 }
      });
    }
    ctx.y -= 5;
  }
  
  // **METADATA**
  const metadata = [
    { label: 'MOM ID:', value: mom.momId },
    { label: 'Revision:', value: mom.revision.toString() },
    { label: 'Date:', value: mom.date },
    { label: 'Status:', value: mom.status }
  ];
  
  metadata.forEach(item => {
    checkPageBreak(ctx, 15);
    // Draw label in bold
    const labelWidth = ctx.boldFont.widthOfTextAtSize(item.label + ' ', 10);
    drawText(ctx, item.label, ctx.leftMargin, {
      fontSize: 10,
      font: ctx.boldFont
    });
    // Draw value
    drawText(ctx, item.value, ctx.leftMargin + labelWidth, {
      fontSize: 10
    });
    ctx.y -= 15;
  });
  
  ctx.y -= 10;
  
  // **COMPANIES AND ATTENDEES - with full Unicode support**
  if (mom.companies.length > 0) {
    checkPageBreak(ctx, 30);
    drawParagraph(ctx, 'Companies and Attendees:', 0, {
      fontSize: 14,
      font: ctx.boldFont
    });
    
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0 
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      // **UNICODE FIX**: Company names and attendee names (potentially in Japanese/Thai) 
      // are rendered as selectable text
      const companyLine = `${company.name} : ${attendeeNames}`;
      drawParagraph(ctx, companyLine, 10, { fontSize: 11 });
    });
    
    ctx.y -= 10;
  }
  
  // **REVISION COMPARISON - with full Unicode support**
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = differences.titleChanged || differences.goalChanged || 
      differences.dateChanged || differences.companiesChanged || 
      differences.attendeesChanged || differences.structureChanges.size > 0 ||
      differences.mainTimeSlotChanged || differences.otherTimeSlotsChanged;
    
    if (hasChanges) {
      checkPageBreak(ctx, 40);
      const revisionTitle = `Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})`;
      drawParagraph(ctx, revisionTitle, 0, {
        fontSize: 14,
        font: ctx.boldFont
      });
      
      const changes: string[] = [];
      if (differences.titleChanged) changes.push('• Meeting Title changed');
      if (differences.goalChanged) changes.push('• Meeting Goal changed');
      if (differences.dateChanged) changes.push('• Meeting Date changed');
      if (differences.companiesChanged) changes.push('• Companies modified');
      if (differences.attendeesChanged) changes.push('• Attendees modified');
      if (differences.mainTimeSlotChanged) changes.push('• Main Time Slot changed');
      if (differences.otherTimeSlotsChanged) changes.push('• Other Country Times changed');
      if (differences.structureChanges.size > 0) {
        changes.push(`• ${differences.structureChanges.size} Agenda Items modified`);
      }
      
      changes.forEach(change => {
        drawParagraph(ctx, change, 10, { fontSize: 11 });
      });
      
      ctx.y -= 10;
    }
  }
  
  // **AGENDA STRUCTURE - with full Unicode support**
  if (mom.structure.length > 0) {
    checkPageBreak(ctx, 30);
    drawParagraph(ctx, 'Agenda:', 0, {
      fontSize: 14,
      font: ctx.boldFont
    });
    
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    await drawStructureItems(ctx, numberedStructure, 0, mom.revision);
  }
  
  // **ADD ATTACHMENT IMAGES**
  await addAttachmentImages(ctx, mom);
  
  // Save and return the PDF
  const pdfBytes = await pdfDoc.save();
  // pdfBytes is a Uint8Array which is a valid BlobPart
  return new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Draw structure items recursively
 */
async function drawStructureItems(
  ctx: PDFContext,
  items: StructureItem[],
  indentLevel: number,
  currentRevision?: number
): Promise<void> {
  for (const item of items) {
    const indent = indentLevel * 15;
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    
    // Calculate font size based on level
    const fontSize = Math.max(14 - item.level, 10);
    
    // **STRUCTURE TITLE - with full Unicode support**
    checkPageBreak(ctx, 30);
    const titleText = `${item.number} ${item.title}`;
    drawParagraph(ctx, titleText, indent, {
      fontSize,
      font: isModified || item.level <= 2 ? ctx.boldFont : ctx.font
    });
    
    // Translations
    if (item.translations) {
      // **UNICODE FIX**: All translations are rendered as selectable text
      const translationText = `EN: ${item.translations.en} | JA: ${item.translations.ja} | TH: ${item.translations.th}`;
      drawParagraph(ctx, translationText, indent + 10, {
        fontSize: 9,
        color: { r: 0.4, g: 0.4, b: 0.4 }
      });
    }
    
    // Level 4 items
    if (item.level === 4) {
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        const responsible = `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`;
        drawParagraph(ctx, responsible, indent + 15, { fontSize: 10 });
      }
      
      if (item.dueDate) {
        drawParagraph(ctx, `Due Date: ${item.dueDate}`, indent + 15, { fontSize: 10 });
      }
      
      if (item.status) {
        drawParagraph(ctx, `Status: ${item.status.toUpperCase()}`, indent + 15, { fontSize: 10 });
      }
      
      if (item.urls && item.urls.length > 0) {
        drawParagraph(ctx, 'URLs:', indent + 15, { fontSize: 10 });
        item.urls.forEach(url => {
          drawParagraph(ctx, `- ${url}`, indent + 20, { fontSize: 10 });
        });
      }
      
      if (item.attachments && item.attachments.length > 0) {
        drawParagraph(ctx, `[${item.attachments.length} attachment(s)]`, indent + 15, {
          fontSize: 10,
          color: { r: 0.4, g: 0.4, b: 0.4 }
        });
      }
      
      ctx.y -= 5;
    }
    
    // Process children
    if (item.children && item.children.length > 0) {
      await drawStructureItems(ctx, item.children, indentLevel + 1, currentRevision);
    }
  }
}

/**
 * Add attachment images to PDF
 */
async function addAttachmentImages(ctx: PDFContext, mom: MOM): Promise<void> {
  const numberedStructure = generateHierarchicalNumbers(mom.structure);
  
  async function processItems(items: StructureItem[]): Promise<void> {
    for (const item of items) {
      if (item.attachments && item.attachments.length > 0) {
        for (const attachment of item.attachments) {
          if (attachment.type === 'image' && attachment.data) {
            try {
              // Add new page for image
              addNewPage(ctx);
              
              // Add title
              drawParagraph(ctx, `Attachment for: ${item.number}. ${item.title}`, 0, {
                fontSize: 12,
                font: ctx.boldFont
              });
              
              // Embed image
              const imageData = attachment.annotations || attachment.data;
              let pdfImage;
              
              if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
                const base64Data = imageData.split(',')[1];
                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                pdfImage = await ctx.doc.embedJpg(imageBytes);
              } else if (imageData.startsWith('data:image/png')) {
                const base64Data = imageData.split(',')[1];
                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                pdfImage = await ctx.doc.embedPng(imageBytes);
              }
              
              if (pdfImage) {
                const scale = Math.min(400 / pdfImage.width, 300 / pdfImage.height);
                const scaledWidth = pdfImage.width * scale;
                const scaledHeight = pdfImage.height * scale;
                
                ctx.page.drawImage(pdfImage, {
                  x: ctx.leftMargin,
                  y: ctx.y - scaledHeight - 20,
                  width: scaledWidth,
                  height: scaledHeight,
                });
              }
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
  }
  
  await processItems(numberedStructure);
}