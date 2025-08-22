// Text-based PDF export using jsPDF for selectable text
import { jsPDF } from 'jspdf';
import { MOM, StructureItem } from '@/types/mom';
import { generatePDFFilename } from './pdf-filename';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

export function exportToPDFTextBased(mom: MOM): void {
  // Initialize PDF with custom fonts that support Unicode
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set margins
  const leftMargin = 20;
  const rightMargin = 20;
  const topMargin = 20;
  const bottomMargin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - leftMargin - rightMargin;
  
  let currentY = topMargin;
  const lineHeight = 6;
  const titleSize = 16;
  const headingSize = 14;
  const normalSize = 11;
  const smallSize = 9;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = normalSize, isBold: boolean = false, indent: number = 0) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    const lines = pdf.splitTextToSize(text, contentWidth - indent);
    
    // Check if we need a new page
    const textHeight = lines.length * fontSize * 0.5;
    if (currentY + textHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      currentY = topMargin;
    }
    
    // Add each line
    lines.forEach((line: string) => {
      pdf.text(line, leftMargin + indent, currentY);
      currentY += fontSize * 0.5;
    });
    
    // Add some spacing after the text
    currentY += lineHeight * 0.3;
  };

  // Add colored text helper
  const addColoredText = (text: string, color: string, fontSize: number = normalSize, indent: number = 0) => {
    const rgb = hexToRgb(color);
    pdf.setTextColor(rgb.r, rgb.g, rgb.b);
    addText(text, fontSize, false, indent);
    pdf.setTextColor(0, 0, 0); // Reset to black
  };

  // Convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Title
  if (mom.titleTranslations) {
    addText(`MOM: ${mom.titleTranslations.en}`, titleSize, true);
    addColoredText(`JA: ${mom.titleTranslations.ja}`, '#008000', smallSize);
    addColoredText(`TH: ${mom.titleTranslations.th}`, '#800080', smallSize);
  } else {
    addText(`MOM: ${mom.title}`, titleSize, true);
  }
  
  currentY += lineHeight;

  // Meeting Goal
  if (mom.goal && mom.goalTranslations) {
    addText(`Meeting Goal: ${mom.goalTranslations.en}`, headingSize, true);
    addColoredText(`JA: ${mom.goalTranslations.ja}`, '#008000', normalSize);
    addColoredText(`TH: ${mom.goalTranslations.th}`, '#800080', normalSize);
  } else if (mom.goal) {
    addText('Meeting Goal:', headingSize, true);
    addText(mom.goal, normalSize, false, 10);
  }
  
  currentY += lineHeight;

  // Metadata - displayed horizontally
  addText(`MOM ID: ${mom.momId} | Revision: ${mom.revision} | Date: ${mom.date} | Status: ${mom.status}`, normalSize, true);
  
  currentY += lineHeight;

  // Time - displayed horizontally
  if (mom.mainTimeSlot) {
    let timeStr = `Time: ${mom.mainTimeSlot.country} (${mom.mainTimeSlot.timezone}): ${mom.mainTimeSlot.startTime} - ${mom.mainTimeSlot.endTime}`;
    
    if (mom.otherTimeSlots && mom.otherTimeSlots.length > 0) {
      mom.otherTimeSlots.forEach(slot => {
        timeStr += ` | ${slot.country} (${slot.timezone}): ${slot.startTime} - ${slot.endTime}`;
      });
    }
    
    addText(timeStr, normalSize, true);
    currentY += lineHeight;
  }

  // Meeting URLs
  if (mom.urls && mom.urls.length > 0) {
    addText('Meeting URLs:', headingSize, true);
    mom.urls.forEach((url, index) => {
      addText(`${index + 1}. ${url}`, normalSize, false, 10);
    });
    currentY += lineHeight;
  }

  // Companies and Attendees
  if (mom.companies.length > 0) {
    addText('Companies and Attendees:', headingSize, true);
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      addText(`• ${company.name} : ${attendeeNames}`, normalSize, false, 10);
    });
    currentY += lineHeight;
  }

  // Agenda
  if (mom.structure.length > 0) {
    addText('Agenda:', headingSize, true);
    currentY += lineHeight * 0.5;
    
    // Generate hierarchical numbers
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    
    const addStructureItem = (item: StructureItem, indentLevel: number) => {
      const indent = indentLevel * 10;
      
      // Item title with translations
      if (item.translations) {
        addText(`${item.number} ${item.translations.en}`, normalSize, true, indent);
        addColoredText(`JA: ${item.translations.ja}`, '#008000', smallSize, indent + 10);
        addColoredText(`TH: ${item.translations.th}`, '#800080', smallSize, indent + 10);
      } else {
        addText(`${item.number} ${item.title}`, normalSize, true, indent);
      }
      
      // Action items (level 4 only)
      if (item.level === 4) {
        
        if (item.responsibleParties && item.responsibleParties.length > 0) {
          const names = item.responsibleParties.map(p => p.name).join(', ');
          addText(`Responsible: ${names}`, normalSize, false, indent + 10);
        }
        
        if (item.dueDate) {
          addText(`Due Date: ${item.dueDate}`, normalSize, false, indent + 10);
        }
        
        if (item.status) {
          addText(`Status: ${item.status.toUpperCase()}`, normalSize, true, indent + 10);
        }
        
        currentY += lineHeight * 0.5;
      }
      
      // Process children
      if (item.children && item.children.length > 0) {
        item.children.forEach(child => {
          addStructureItem(child, indentLevel + 1);
        });
      }
    };
    
    numberedStructure.forEach(item => {
      addStructureItem(item, 0);
    });
  }

  // Footer
  currentY = pageHeight - bottomMargin - 10;
  pdf.setFontSize(smallSize);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated on ${new Date().toLocaleString()}`, leftMargin, currentY);

  // Save the PDF
  pdf.save(generatePDFFilename(mom));
}