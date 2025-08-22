// **FONTKIT IMPLEMENTATION**: Complete Unicode support with custom fonts
// This implementation uses jsPDF with fontkit for proper font embedding

import { MOM, StructureItem } from '@/types/mom';
import jsPDF from 'jspdf';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

// Import Noto Sans font data (base64 encoded)
// Note: In production, these should be loaded from external files or CDN
const NOTO_SANS_REGULAR = 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6Vc.ttf';
const NOTO_SANS_JP_REGULAR = 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf';
const NOTO_SANS_THAI_REGULAR = 'https://fonts.gstatic.com/s/notosansthai/v25/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU5RtpzF-QRvzzXg.ttf';

interface PDFContext {
  pdf: jsPDF;
  y: number;
  pageHeight: number;
  pageWidth: number;
  leftMargin: number;
  rightMargin: number;
  contentWidth: number;
  currentFontSize: number;
}

/**
 * Load font from URL and convert to base64
 */
async function loadFontAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:font/ttf;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading font:', error);
    throw error;
  }
}

/**
 * Initialize PDF with custom fonts
 */
async function initializePDFWithFonts(): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });

  try {
    // Load fonts
    const [notoSans, notoSansJp, notoSansThai] = await Promise.all([
      loadFontAsBase64(NOTO_SANS_REGULAR),
      loadFontAsBase64(NOTO_SANS_JP_REGULAR),
      loadFontAsBase64(NOTO_SANS_THAI_REGULAR)
    ]);

    // Add fonts to PDF
    pdf.addFileToVFS('NotoSans-Regular.ttf', notoSans);
    pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    
    pdf.addFileToVFS('NotoSansJP-Regular.ttf', notoSansJp);
    pdf.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    
    pdf.addFileToVFS('NotoSansThai-Regular.ttf', notoSansThai);
    pdf.addFont('NotoSansThai-Regular.ttf', 'NotoSansThai', 'normal');
    
    // Set default font
    pdf.setFont('NotoSans', 'normal');
  } catch (error) {
    console.error('Failed to load custom fonts, using default:', error);
    // Fallback to default font
    pdf.setFont('helvetica', 'normal');
  }

  return pdf;
}

/**
 * Detect script and set appropriate font
 */
function setFontForText(pdf: jsPDF, text: string): void {
  // Check for Japanese characters
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    try {
      pdf.setFont('NotoSansJP', 'normal');
    } catch {
      pdf.setFont('helvetica', 'normal');
    }
  }
  // Check for Thai characters
  else if (/[\u0E00-\u0E7F]/.test(text)) {
    try {
      pdf.setFont('NotoSansThai', 'normal');
    } catch {
      pdf.setFont('helvetica', 'normal');
    }
  }
  // Default to NotoSans for other text
  else {
    try {
      pdf.setFont('NotoSans', 'normal');
    } catch {
      pdf.setFont('helvetica', 'normal');
    }
  }
}

/**
 * Draw text with proper font selection
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
  const fontSize = options?.fontSize || ctx.currentFontSize;
  const indent = options?.indent || 0;
  
  ctx.pdf.setFontSize(fontSize);
  
  if (options?.color) {
    const r = parseInt(options.color.slice(1, 3), 16);
    const g = parseInt(options.color.slice(3, 5), 16);
    const b = parseInt(options.color.slice(5, 7), 16);
    ctx.pdf.setTextColor(r, g, b);
  }
  
  // Set appropriate font for the text
  setFontForText(ctx.pdf, text);
  
  // Check page break
  if (ctx.y > ctx.pageHeight - 20) {
    ctx.pdf.addPage();
    ctx.y = 20;
  }
  
  // Draw text with automatic line wrapping
  const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth - indent);
  
  lines.forEach((line: string) => {
    if (ctx.y > ctx.pageHeight - 20) {
      ctx.pdf.addPage();
      ctx.y = 20;
    }
    
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
    
    // Title
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
 * Main export function with custom fonts
 */
export async function exportToPDFWithFontkit(mom: MOM): Promise<Blob> {
  try {
    // Initialize PDF with custom fonts
    const pdf = await initializePDFWithFonts();
    
    // Set document properties
    pdf.setProperties({
      title: `${mom.momId}_Rev.${mom.revision}`,
      subject: mom.title,
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
      contentWidth: 170,
      currentFontSize: 11
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
    const metadata = [
      { label: 'MOM ID: ', value: mom.momId },
      { label: 'Revision: ', value: mom.revision.toString() },
      { label: 'Date: ', value: mom.date },
      { label: 'Status: ', value: mom.status }
    ];
    
    metadata.forEach(item => {
      ctx.pdf.setFontSize(10);
      ctx.pdf.setFont('helvetica', 'bold');
      const labelWidth = ctx.pdf.getTextWidth(item.label);
      ctx.pdf.text(item.label, ctx.leftMargin, ctx.y);
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.text(item.value, ctx.leftMargin + labelWidth, ctx.y);
      ctx.y += 6;
    });
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
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}