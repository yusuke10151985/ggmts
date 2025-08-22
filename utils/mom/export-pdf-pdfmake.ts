// **PDFMAKE IMPLEMENTATION**: Complete Unicode support with selectable text
// This implementation uses pdfmake which has better Unicode support than jsPDF

import { MOM, StructureItem } from '@/types/mom';
import { Content, TDocumentDefinitions, Style } from 'pdfmake/interfaces';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';
import { setupPdfMakeFonts } from './pdf-fonts';

// Define styles
const styles: Record<string, Style> = {
  title: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
  heading1: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
  heading2: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
  heading3: { fontSize: 11, bold: true, margin: [0, 6, 0, 3] },
  normal: { fontSize: 10, margin: [0, 0, 0, 3] },
  small: { fontSize: 9, color: '#666666', margin: [0, 0, 0, 2] },
  url: { fontSize: 8, color: '#0066CC', margin: [0, 0, 0, 2] }, // URLは2pt小さい
  metadata: { fontSize: 10, margin: [0, 0, 0, 5] },
  bold: { bold: true },
  indent1: { margin: [10, 0, 0, 0] },
  indent2: { margin: [20, 0, 0, 0] },
  indent3: { margin: [30, 0, 0, 0] },
  indent4: { margin: [40, 0, 0, 0] },
  translation: { fontSize: 9, color: '#666666', margin: [5, 0, 0, 2] },
  revision: { bold: true, color: '#CC0000' }
};

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
 * Create translation content
 */
function createTranslationContent(translations: { en: string; ja: string; th: string } | undefined): Content[] {
  if (!translations) return [];
  
  return [
    { text: `EN: ${translations.en}`, style: 'translation' },
    { text: `JA: ${translations.ja}`, style: 'translation' },
    { text: `TH: ${translations.th}`, style: 'translation' }
  ];
}

/**
 * Create structure content recursively
 */
function createStructureContent(
  items: StructureItem[], 
  indentLevel: number, 
  currentRevision?: number
): Content[] {
  const content: Content[] = [];
  
  items.forEach(item => {
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    const indentStyle = `indent${Math.min(indentLevel, 4)}`;
    const headingStyle = item.level <= 2 ? 'heading2' : 'heading3';
    
    // Item title
    const titleContent: Content = {
      text: `${item.number} ${item.title}`,
      style: [headingStyle, indentStyle],
      bold: isModified || item.level <= 2
    };
    
    if (isModified) {
      titleContent.style = Array.isArray(titleContent.style) 
        ? [...titleContent.style, 'revision'] 
        : [titleContent.style as string, 'revision'];
    }
    
    content.push(titleContent);
    
    // Translations
    if (item.translations) {
      const translationContent = createTranslationContent(item.translations);
      translationContent.forEach(tc => {
        if (typeof tc === 'object' && 'style' in tc) {
          tc.style = Array.isArray(tc.style) 
            ? [...tc.style, indentStyle] 
            : [tc.style as string, indentStyle];
        }
      });
      content.push(...translationContent);
    }
    
    // Level 4 items
    if (item.level === 4) {
      const detailIndent = `indent${Math.min(indentLevel + 1, 4)}`;
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        content.push({
          text: `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`,
          style: ['normal', detailIndent]
        });
      }
      
      if (item.dueDate) {
        content.push({
          text: `Due Date: ${item.dueDate}`,
          style: ['normal', detailIndent]
        });
      }
      
      if (item.status) {
        content.push({
          text: `Status: ${item.status.toUpperCase()}`,
          style: ['normal', detailIndent, 'bold']
        });
      }
      
      if (item.urls && item.urls.length > 0) {
        content.push({
          text: 'URLs:',
          style: ['normal', detailIndent]
        });
        
        item.urls.forEach(url => {
          content.push({
            text: url,
            link: url,
            style: ['url', detailIndent], // URLスタイルを使用（8pt）
            decoration: 'underline'
          });
        });
      }
      
      if (item.attachments && item.attachments.length > 0) {
        content.push({
          text: `[${item.attachments.length} attachment(s)]`,
          style: ['small', detailIndent]
        });
      }
      
      // Add spacing after level 4 items
      content.push({ text: ' ', margin: [0, 5, 0, 0] });
    }
    
    // Process children
    if (item.children && item.children.length > 0) {
      content.push(...createStructureContent(item.children, indentLevel + 1, currentRevision));
    }
  });
  
  return content;
}

/**
 * Create attachment pages
 */
async function createAttachmentPages(mom: MOM): Promise<Content[]> {
  const pages: Content[] = [];
  const numberedStructure = generateHierarchicalNumbers(mom.structure);
  
  const processItems = async (items: StructureItem[]): Promise<void> => {
    for (const item of items) {
      if (item.attachments && item.attachments.length > 0) {
        for (const attachment of item.attachments) {
          if (attachment.type === 'image' && attachment.data) {
            const imageData = attachment.annotations || attachment.data;
            
            pages.push({
              text: `Attachment for: ${item.number}. ${item.title}`,
              style: 'heading2',
              pageBreak: 'before'
            });
            
            pages.push({
              image: imageData,
              width: 500,
              margin: [0, 10, 0, 0]
            });
          }
        }
      }
      
      if (item.children && item.children.length > 0) {
        await processItems(item.children);
      }
    }
  };
  
  await processItems(numberedStructure);
  return pages;
}

/**
 * Main export function using pdfmake
 */
export async function exportToPDFWithPdfMake(mom: MOM): Promise<Blob> {
  // Dynamic import pdfmake
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  
  // Set up fonts
  await setupPdfMakeFonts(pdfMake);
  
  const content: Content[] = [];
  
  // Title
  content.push({
    text: `MOM: ${mom.title}`,
    style: 'title'
  });
  
  // Title translations
  if (mom.titleTranslations) {
    content.push(...createTranslationContent(mom.titleTranslations));
  }
  
  // Meeting Goal
  if (mom.goal) {
    content.push({ text: 'Meeting Goal:', style: 'heading1' });
    content.push({ text: mom.goal, style: 'normal', margin: [10, 0, 0, 5] });
    
    if (mom.goalTranslations) {
      const goalTranslations = createTranslationContent(mom.goalTranslations);
      goalTranslations.forEach(gt => {
        if (typeof gt === 'object' && 'style' in gt) {
          gt.style = Array.isArray(gt.style)
            ? [...gt.style, 'indent1']
            : [gt.style as string, 'indent1'];
        }
      });
      content.push(...goalTranslations);
    }
  }
  
  // Metadata
  content.push(
    { text: [{ text: 'MOM ID: ', bold: true }, mom.momId], style: 'metadata' },
    { text: [{ text: 'Revision: ', bold: true }, mom.revision.toString()], style: 'metadata' },
    { text: [{ text: 'Date: ', bold: true }, mom.date], style: 'metadata' },
    { text: [{ text: 'Status: ', bold: true }, mom.status], style: 'metadata' }
  );
  
  // Companies and Attendees
  if (mom.companies.length > 0) {
    content.push({ text: 'Companies and Attendees:', style: 'heading1' });
    
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      content.push({
        text: `${company.name} : ${attendeeNames}`,
        style: ['normal', 'indent1']
      });
    });
  }
  
  // Revision comparison
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = differences.titleChanged || differences.goalChanged ||
      differences.dateChanged || differences.companiesChanged ||
      differences.attendeesChanged || differences.structureChanges.size > 0 ||
      differences.mainTimeSlotChanged || differences.otherTimeSlotsChanged;
    
    if (hasChanges) {
      content.push({
        text: `Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})`,
        style: 'heading1'
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
        content.push({
          text: `• ${change}`,
          style: ['normal', 'indent1', 'bold']
        });
      });
    }
  }
  
  // Agenda
  if (mom.structure.length > 0) {
    content.push({ text: 'Agenda:', style: 'heading1' });
    
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    content.push(...createStructureContent(numberedStructure, 0, mom.revision));
  }
  
  // Add attachment images
  const attachmentPages = await createAttachmentPages(mom);
  content.push(...attachmentPages);
  
  // Document definition
  const docDefinition: TDocumentDefinitions = {
    content,
    styles,
    defaultStyle: {
      font: 'Roboto' // pdfmake's default font supports basic Unicode
    },
    info: {
      title: `${mom.momId}_Rev.${mom.revision}`,
      subject: mom.title,
      author: 'MOM Manager',
      creator: 'MOM Manager - Unicode Edition',
      producer: 'pdfmake'
    },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40]
  };
  
  return new Promise((resolve) => {
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBlob((blob: Blob) => {
      resolve(blob);
    });
  });
}