// **FINAL UNICODE FIX**: Complete rewrite with proper font embedding
// This implementation ensures all Unicode text (Japanese, Thai, etc.) is properly embedded
// and remains selectable in PDF viewers

import { MOM, StructureItem } from '@/types/mom';
import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';
import { loadNotoSansFont, loadNotoSansThaiFont } from './noto-font-loader';

interface PDFContext {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  unicodeFont: PDFFont | null;
  thaiFont: PDFFont | null;
  y: number;
  pageHeight: number;
  pageWidth: number;
  leftMargin: number;
  rightMargin: number;
  contentWidth: number;
  fontSize: number;
}

/**
 * Detect if text contains characters that need special fonts
 */
function detectLanguage(text: string): 'japanese' | 'thai' | 'english' {
  // Japanese characters (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return 'japanese';
  }
  // Thai characters
  if (/[\u0E00-\u0E7F]/.test(text)) {
    return 'thai';
  }
  return 'english';
}

/**
 * Get appropriate font for the text
 * **FIX**: Always use Unicode font if available to avoid WinAnsi encoding errors
 */
function getFontForText(ctx: PDFContext, text: string, isBold: boolean = false): PDFFont {
  const language = detectLanguage(text);
  
  // **CRITICAL FIX**: Always prefer Unicode fonts to avoid encoding issues
  // Even for English text, if it contains special punctuation, use Unicode font
  switch (language) {
    case 'japanese':
      // Must use Unicode font for Japanese
      if (!ctx.unicodeFont) {
        throw new Error('Japanese font not loaded. Cannot render Japanese text.');
      }
      return ctx.unicodeFont;
    case 'thai':
      // Must use Thai font for Thai text
      if (!ctx.thaiFont) {
        throw new Error('Thai font not loaded. Cannot render Thai text.');
      }
      return ctx.thaiFont;
    default:
      // For English, check if text contains any non-ASCII characters
      // This includes special punctuation that might appear in mixed text
      if (ctx.unicodeFont && /[^\x00-\x7F]/.test(text)) {
        return ctx.unicodeFont;
      }
      // Only use standard fonts for pure ASCII text
      return isBold ? ctx.boldFont : ctx.font;
  }
}

/**
 * Add a new page to the PDF
 */
function addNewPage(ctx: PDFContext): void {
  ctx.page = ctx.doc.addPage();
  ctx.y = ctx.pageHeight - 50;
}

/**
 * Check if we need a page break
 */
function checkPageBreak(ctx: PDFContext, requiredSpace: number): void {
  if (ctx.y - requiredSpace < 50) {
    addNewPage(ctx);
  }
}

/**
 * Draw text with proper Unicode support
 * **CRITICAL**: This function automatically selects the right font for the text
 */
function drawText(
  ctx: PDFContext,
  text: string,
  x: number,
  options?: { 
    fontSize?: number; 
    isBold?: boolean;
    color?: { r: number; g: number; b: number };
    maxWidth?: number;
  }
): void {
  const fontSize = options?.fontSize || ctx.fontSize;
  const color = options?.color || { r: 0, g: 0, b: 0 };
  const font = getFontForText(ctx, text, options?.isBold);
  
  // **UNICODE FIX**: Draw text with appropriate font
  ctx.page.drawText(text, {
    x: x,
    y: ctx.y,
    size: fontSize,
    font: font,
    color: rgb(color.r, color.g, color.b),
    maxWidth: options?.maxWidth,
  });
}

/**
 * Draw a paragraph with mixed languages support
 * **IMPORTANT**: This function handles mixed language text by splitting and using appropriate fonts
 */
function drawParagraph(
  ctx: PDFContext,
  text: string,
  indent: number = 0,
  options?: {
    fontSize?: number;
    isBold?: boolean;
    color?: { r: number; g: number; b: number };
    lineSpacing?: number;
    paragraphSpacing?: number;
  }
): void {
  const fontSize = options?.fontSize || ctx.fontSize;
  const lineSpacing = options?.lineSpacing || 1.2;
  const paragraphSpacing = options?.paragraphSpacing || 5;
  const maxWidth = ctx.contentWidth - indent;
  
  // **CRITICAL**: Split text into segments by language
  // This ensures each segment uses the appropriate font
  const segments = splitTextByLanguage(text);
  
  let currentX = ctx.leftMargin + indent;
  let currentLineWidth = 0;
  let lineSegments: { text: string; font: PDFFont }[] = [];
  
  for (const segment of segments) {
    const font = getFontForText(ctx, segment, options?.isBold);
    const words = segment.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const space = i > 0 ? ' ' : '';
      const testText = space + word;
      const width = font.widthOfTextAtSize(testText, fontSize);
      
      if (currentLineWidth + width > maxWidth && lineSegments.length > 0) {
        // Draw current line
        drawLine(ctx, lineSegments, currentX, fontSize, options);
        ctx.y -= fontSize * lineSpacing;
        
        // Reset for new line
        lineSegments = [];
        currentLineWidth = 0;
        currentX = ctx.leftMargin + indent;
        
        // Add word to new line
        lineSegments.push({ text: word, font });
        currentLineWidth = font.widthOfTextAtSize(word, fontSize);
      } else {
        // Add to current line
        lineSegments.push({ text: testText, font });
        currentLineWidth += width;
      }
    }
  }
  
  // Draw remaining text
  if (lineSegments.length > 0) {
    drawLine(ctx, lineSegments, currentX, fontSize, options);
    ctx.y -= fontSize * lineSpacing;
  }
  
  // Add paragraph spacing
  ctx.y -= paragraphSpacing;
}

/**
 * Split text into segments by language
 */
function splitTextByLanguage(text: string): string[] {
  const segments: string[] = [];
  let currentSegment = '';
  let currentLanguage: string | null = null;
  
  for (const char of text) {
    const charLanguage = detectLanguage(char);
    
    if (currentLanguage === null) {
      currentLanguage = charLanguage;
      currentSegment = char;
    } else if (currentLanguage === charLanguage || char === ' ') {
      currentSegment += char;
    } else {
      segments.push(currentSegment);
      currentSegment = char;
      currentLanguage = charLanguage;
    }
  }
  
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return segments;
}

/**
 * Draw a line with mixed fonts
 */
function drawLine(
  ctx: PDFContext,
  segments: { text: string; font: PDFFont }[],
  startX: number,
  fontSize: number,
  options?: { color?: { r: number; g: number; b: number } }
): void {
  let x = startX;
  const color = options?.color || { r: 0, g: 0, b: 0 };
  
  checkPageBreak(ctx, fontSize * 1.2);
  
  for (const segment of segments) {
    ctx.page.drawText(segment.text, {
      x: x,
      y: ctx.y,
      size: fontSize,
      font: segment.font,
      color: rgb(color.r, color.g, color.b),
    });
    x += segment.font.widthOfTextAtSize(segment.text, fontSize);
  }
}

/**
 * Main export function with complete Unicode support
 */
export async function exportToPDFWithCompleteUnicode(mom: MOM): Promise<Blob> {
  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  
  // **CRITICAL**: Register fontkit for custom font support
  pdfDoc.registerFontkit(fontkit);
  
  // Load standard fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // **UNICODE FONT LOADING**: Load Noto Sans fonts for Unicode support
  let unicodeFont: PDFFont | null = null;
  let thaiFont: PDFFont | null = null;
  
  // **CRITICAL**: We MUST have Unicode fonts for Japanese/Thai text
  // Load fonts with proper error handling
  try {
    // Load Japanese font
    console.log('Loading Japanese font...');
    const notoSansData = await loadNotoSansFont();
    if (notoSansData) {
      unicodeFont = await pdfDoc.embedFont(notoSansData, { subset: true });
      console.log('Japanese font loaded successfully');
    } else {
      throw new Error('Failed to load Japanese font data');
    }
  } catch (error) {
    console.error('Failed to embed Japanese font:', error);
    // **FALLBACK**: If external font fails, we'll need to handle this
    // For now, we'll continue but text might not render correctly
  }
  
  try {
    // Load Thai font
    console.log('Loading Thai font...');
    const notoSansThaiData = await loadNotoSansThaiFont();
    if (notoSansThaiData) {
      thaiFont = await pdfDoc.embedFont(notoSansThaiData, { subset: true });
      console.log('Thai font loaded successfully');
    } else {
      throw new Error('Failed to load Thai font data');
    }
  } catch (error) {
    console.error('Failed to embed Thai font:', error);
    // **FALLBACK**: If external font fails, use Unicode font as fallback
    if (unicodeFont) {
      thaiFont = unicodeFont;
    }
  }
  
  // Set metadata
  pdfDoc.setTitle(`MOM-${mom.momId}_Rev.${mom.revision}`);
  pdfDoc.setSubject(mom.title);
  pdfDoc.setCreator('MOM Manager');
  pdfDoc.setProducer('MOM Manager - Unicode Edition');
  pdfDoc.setCreationDate(new Date());
  
  // Initialize context
  const firstPage = pdfDoc.addPage();
  const { width, height } = firstPage.getSize();
  
  const ctx: PDFContext = {
    doc: pdfDoc,
    page: firstPage,
    font: helveticaFont,
    boldFont: helveticaBoldFont,
    unicodeFont,
    thaiFont,
    y: height - 50,
    pageHeight: height,
    pageWidth: width,
    leftMargin: 50,
    rightMargin: 50,
    contentWidth: width - 100,
    fontSize: 11
  };
  
  // **TITLE**
  drawParagraph(ctx, `MOM: ${mom.title}`, 0, {
    fontSize: 18,
    isBold: true
  });
  
  // Title translations
  if (mom.titleTranslations) {
    const translationText = `EN: ${mom.titleTranslations.en} | JA: ${mom.titleTranslations.ja} | TH: ${mom.titleTranslations.th}`;
    drawParagraph(ctx, translationText, 0, {
      fontSize: 10,
      color: { r: 0.4, g: 0.4, b: 0.4 }
    });
  }
  
  ctx.y -= 10;
  
  // **MEETING GOAL**
  if (mom.goal) {
    drawParagraph(ctx, 'Meeting Goal:', 0, {
      fontSize: 12,
      isBold: true
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
    drawText(ctx, item.label, ctx.leftMargin, {
      fontSize: 10,
      isBold: true
    });
    const labelWidth = ctx.boldFont.widthOfTextAtSize(item.label + ' ', 10);
    drawText(ctx, item.value, ctx.leftMargin + labelWidth, {
      fontSize: 10
    });
    ctx.y -= 15;
  });
  
  ctx.y -= 10;
  
  // **COMPANIES AND ATTENDEES**
  if (mom.companies.length > 0) {
    checkPageBreak(ctx, 30);
    drawParagraph(ctx, 'Companies and Attendees:', 0, {
      fontSize: 14,
      isBold: true
    });
    
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0 
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      const companyLine = `${company.name} : ${attendeeNames}`;
      drawParagraph(ctx, companyLine, 10, { fontSize: 11 });
    });
    
    ctx.y -= 10;
  }
  
  // **AGENDA STRUCTURE**
  if (mom.structure.length > 0) {
    checkPageBreak(ctx, 30);
    drawParagraph(ctx, 'Agenda:', 0, {
      fontSize: 14,
      isBold: true
    });
    
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    await drawStructureItems(ctx, numberedStructure, 0, mom.revision);
  }
  
  // Save and return
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
    const fontSize = Math.max(14 - item.level, 10);
    
    // Title
    checkPageBreak(ctx, 30);
    const titleText = `${item.number} ${item.title}`;
    drawParagraph(ctx, titleText, indent, {
      fontSize,
      isBold: isModified || item.level <= 2
    });
    
    // Translations
    if (item.translations) {
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