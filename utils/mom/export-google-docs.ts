// Google Docs export functionality
// This exports MOM data to Google Docs format using Google Docs API

import { MOM, StructureItem } from '@/types/mom';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';
import { processAttachmentsForExport, calculateImageDimensions } from './imageProcessing';

// Google Docs API types
interface GoogleDocsRequest {
  insertText?: {
    text: string;
    location?: { index: number };
  };
  updateParagraphStyle?: {
    paragraphStyle: any;
    range: { startIndex: number; endIndex: number };
    fields: string;
  };
  updateTextStyle?: {
    textStyle: any;
    range: { startIndex: number; endIndex: number };
    fields: string;
  };
}

// Style configurations for different heading levels
const STYLES = {
  title: {
    fontSize: { magnitude: 20, unit: 'PT' },
    bold: true,
    foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } }
  },
  heading1: {
    fontSize: { magnitude: 16, unit: 'PT' },
    bold: true
  },
  heading2: {
    fontSize: { magnitude: 14, unit: 'PT' },
    bold: true
  },
  heading3: {
    fontSize: { magnitude: 12, unit: 'PT' },
    bold: true
  },
  normal: {
    fontSize: { magnitude: 11, unit: 'PT' },
    bold: false
  },
  small: {
    fontSize: { magnitude: 10, unit: 'PT' },
    foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } }
  },
  url: {
    fontSize: { magnitude: 9, unit: 'PT' },
    foregroundColor: { color: { rgbColor: { red: 0, green: 0.4, blue: 0.8 } } },
    underline: true
  },
  translation: {
    fontSize: { magnitude: 10, unit: 'PT' },
    foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } },
    italic: true
  },
  revision: {
    bold: true,
    foregroundColor: { color: { rgbColor: { red: 0.8, green: 0, blue: 0 } } }
  },
  action: {
    fontSize: { magnitude: 12, unit: 'PT' },
    bold: true,
    foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0.8 } } }
  },
  actionDetails: {
    fontSize: { magnitude: 11, unit: 'PT' },
    bold: true,
    foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0.8 } } }
  }
};

/**
 * Generate Google Docs filename
 */
export function generateGoogleDocsFilename(mom: MOM): string {
  // Use the centralized filename generator
  const { generatePDFFilename } = require('./pdf-filename');
  // Remove the .pdf extension for Google Docs
  return generatePDFFilename(mom).replace(/\.pdf$/, '');
}

/**
 * Build Google Docs API requests
 */
class GoogleDocsBuilder {
  private requests: GoogleDocsRequest[] = [];
  private currentIndex: number = 1; // Google Docs starts at index 1

  addText(text: string): number {
    const startIndex = this.currentIndex;
    this.requests.push({
      insertText: {
        text,
        location: { index: this.currentIndex }
      }
    });
    this.currentIndex += text.length;
    return startIndex;
  }

  addStyledText(text: string, style: any): void {
    const startIndex = this.addText(text);
    const endIndex = this.currentIndex;
    
    this.requests.push({
      updateTextStyle: {
        textStyle: style,
        range: { startIndex, endIndex },
        fields: Object.keys(style).join(',')
      }
    });
  }

  addParagraph(text: string, style: any, paragraphStyle?: any): void {
    const startIndex = this.addText(text + '\n');
    const endIndex = this.currentIndex;
    
    // Apply text style
    if (style) {
      this.requests.push({
        updateTextStyle: {
          textStyle: style,
          range: { startIndex, endIndex: endIndex - 1 }, // Exclude newline
          fields: Object.keys(style).join(',')
        }
      });
    }
    
    // Apply paragraph style
    if (paragraphStyle) {
      this.requests.push({
        updateParagraphStyle: {
          paragraphStyle,
          range: { startIndex, endIndex },
          fields: Object.keys(paragraphStyle).join(',')
        }
      });
    }
  }

  addBulletItem(text: string, nestingLevel: number = 0, style?: any): void {
    const startIndex = this.addText(text + '\n');
    const endIndex = this.currentIndex;
    
    // Apply text style if provided
    if (style) {
      this.requests.push({
        updateTextStyle: {
          textStyle: style,
          range: { startIndex, endIndex: endIndex - 1 },
          fields: Object.keys(style).join(',')
        }
      });
    }
    
    // Apply bullet style
    this.requests.push({
      updateParagraphStyle: {
        paragraphStyle: {
          namedStyleType: 'NORMAL_TEXT',
          indentStart: { magnitude: 18 * (nestingLevel + 1), unit: 'PT' },
          indentFirstLine: { magnitude: -18, unit: 'PT' }
        },
        range: { startIndex, endIndex },
        fields: 'namedStyleType,indentStart,indentFirstLine'
      }
    });
  }

  addNewline(): void {
    this.addText('\n');
  }

  getRequests(): GoogleDocsRequest[] {
    return this.requests;
  }
}

/**
 * Add structure items to Google Docs
 */
function addStructureToGoogleDocs(
  builder: GoogleDocsBuilder,
  items: StructureItem[],
  indentLevel: number,
  currentRevision?: number
): void {
  items.forEach(item => {
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    const headingStyle = item.level <= 2 ? STYLES.heading2 : (item.level === 4 ? STYLES.action : STYLES.heading3);
    
    // Main item with hierarchical number - show only translations
    const itemStyle = isModified ? { ...headingStyle, ...STYLES.revision } : headingStyle;
    
    if (item.translations) {
      if (item.level === 1) {
        // Main Title - use inline format
        const titleText = `${item.number} ${item.translations.en} | JA: ${item.translations.ja} | TH: ${item.translations.th}`;
        builder.addParagraph(
          titleText,
          itemStyle,
          { indentStart: { magnitude: 18 * indentLevel, unit: 'PT' } }
        );
      } else {
        // Sub Title and below - show EN next to number, then JA and TH on separate lines
        builder.addParagraph(
          `${item.number} ${item.translations.en}`,
          itemStyle,
          { indentStart: { magnitude: 18 * indentLevel, unit: 'PT' } }
        );
        builder.addParagraph(
          `JA: ${item.translations.ja}`,
          STYLES.translation,
          { indentStart: { magnitude: 18 * (indentLevel + 1), unit: 'PT' } }
        );
        builder.addParagraph(
          `TH: ${item.translations.th}`,
          STYLES.translation,
          { indentStart: { magnitude: 18 * (indentLevel + 1), unit: 'PT' } }
        );
      }
    } else {
      // Fallback to original if no translations
      const titleText = `${item.number} ${item.title}`;
      builder.addParagraph(
        titleText,
        itemStyle,
        { indentStart: { magnitude: 18 * indentLevel, unit: 'PT' } }
      );
    }
    
    // Level 4 items
    if (item.level === 4) {
      const detailIndent = indentLevel + 1;
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        builder.addParagraph(
          `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`,
          STYLES.normal,
          { indentStart: { magnitude: 18 * detailIndent, unit: 'PT' } }
        );
      }
      
      if (item.dueDate) {
        builder.addParagraph(
          `Due Date: ${item.dueDate}`,
          STYLES.normal,
          { indentStart: { magnitude: 18 * detailIndent, unit: 'PT' } }
        );
      }
      
      if (item.status) {
        const statusStyle = item.status === 'open' 
          ? { ...STYLES.normal, bold: true, foregroundColor: { color: { rgbColor: { red: 0.8, green: 0, blue: 0 } } } }
          : { ...STYLES.normal, bold: true };
        builder.addParagraph(
          `Status: ${item.status.toUpperCase()}`,
          statusStyle,
          { indentStart: { magnitude: 18 * detailIndent, unit: 'PT' } }
        );
      }
      
      if (item.urls && item.urls.length > 0) {
        builder.addParagraph(
          'URLs:',
          STYLES.normal,
          { indentStart: { magnitude: 18 * detailIndent, unit: 'PT' } }
        );
        
        item.urls.forEach(url => {
          builder.addParagraph(
            url,
            STYLES.url,
            { indentStart: { magnitude: 18 * (detailIndent + 1), unit: 'PT' } }
          );
        });
      }
      
      if (item.attachments && item.attachments.length > 0) {
        builder.addParagraph(
          `[${item.attachments.length} attachment(s)]`,
          STYLES.small,
          { indentStart: { magnitude: 18 * detailIndent, unit: 'PT' } }
        );
      }
      
      // Add spacing after level 4 items
      builder.addNewline();
    }
    
    // Process children
    if (item.children && item.children.length > 0) {
      addStructureToGoogleDocs(builder, item.children, indentLevel + 1, currentRevision);
    }
  });
}

/**
 * Export MOM to Google Docs format
 * Returns the requests array that can be sent to Google Docs API
 */
export function exportToGoogleDocsRequests(mom: MOM): GoogleDocsRequest[] {
  const builder = new GoogleDocsBuilder();
  
  // Title - show only translations
  if (mom.titleTranslations) {
    builder.addParagraph(`MOM: ${mom.titleTranslations.en}`, STYLES.title);
    builder.addParagraph(`JA: ${mom.titleTranslations.ja}`, STYLES.translation);
    builder.addParagraph(`TH: ${mom.titleTranslations.th}`, STYLES.translation);
  } else {
    // Fallback to original if no translations
    builder.addParagraph(`MOM: ${mom.title}`, STYLES.title);
  }
  
  builder.addNewline();
  
  // Meeting Goal - show only translations
  if (mom.goal && mom.goalTranslations) {
    builder.addParagraph(`Meeting Goal: ${mom.goalTranslations.en}`, STYLES.heading1);
    builder.addParagraph(`JA: ${mom.goalTranslations.ja}`, STYLES.normal, { indentStart: { magnitude: 18, unit: 'PT' } });
    builder.addParagraph(`TH: ${mom.goalTranslations.th}`, STYLES.normal, { indentStart: { magnitude: 18, unit: 'PT' } });
    builder.addNewline();
  } else if (mom.goal) {
    // Fallback to original if no translations
    builder.addParagraph('Meeting Goal:', STYLES.heading1);
    builder.addParagraph(mom.goal, STYLES.normal, { indentStart: { magnitude: 18, unit: 'PT' } });
    builder.addNewline();
  }
  
  // Metadata - displayed horizontally
  builder.addParagraph(
    `MOM ID: ${mom.momId} | Revision: ${mom.revision} | Date: ${mom.date} | Status: ${mom.status}`,
    STYLES.normal
  );
  builder.addNewline();
  
  // Time Slots - displayed horizontally
  if (mom.mainTimeSlot) {
    let timeStr = `Time: ${mom.mainTimeSlot.country} (${mom.mainTimeSlot.timezone}): ${mom.mainTimeSlot.startTime} - ${mom.mainTimeSlot.endTime}`;
    
    if (mom.otherTimeSlots && mom.otherTimeSlots.length > 0) {
      mom.otherTimeSlots.forEach(slot => {
        timeStr += ` | ${slot.country} (${slot.timezone}): ${slot.startTime} - ${slot.endTime}`;
      });
    }
    
    builder.addParagraph(timeStr, STYLES.normal);
    builder.addNewline();
  }
  
  // Meeting URLs
  if (mom.urls && mom.urls.length > 0) {
    builder.addParagraph('Meeting URLs:', STYLES.heading1);
    mom.urls.forEach((url, index) => {
      builder.addParagraph(`${index + 1}. ${url}`, STYLES.url, { indentStart: { magnitude: 18, unit: 'PT' } });
    });
    builder.addNewline();
  }
  
  // Companies and Attendees
  if (mom.companies.length > 0) {
    builder.addParagraph('Companies and Attendees:', STYLES.heading1);
    
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      builder.addBulletItem(`${company.name} : ${attendeeNames}`, 0, STYLES.normal);
    });
    
    builder.addNewline();
  }
  
  // Revision comparison
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
    const hasChanges = differences.titleChanged || differences.goalChanged ||
      differences.dateChanged || differences.companiesChanged ||
      differences.attendeesChanged || differences.structureChanges.size > 0 ||
      differences.mainTimeSlotChanged || differences.otherTimeSlotsChanged;
    
    if (hasChanges) {
      builder.addParagraph(
        `Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})`,
        STYLES.heading1
      );
      
      if (differences.titleChanged) {
        builder.addBulletItem('Meeting Title changed', 0, { ...STYLES.normal, bold: true });
      }
      if (differences.goalChanged) {
        builder.addBulletItem('Meeting Goal changed', 0, { ...STYLES.normal, bold: true });
      }
      if (differences.dateChanged) {
        builder.addBulletItem('Meeting Date changed', 0, { ...STYLES.normal, bold: true });
      }
      if (differences.companiesChanged) {
        builder.addBulletItem('Companies modified', 0, { ...STYLES.normal, bold: true });
      }
      if (differences.attendeesChanged) {
        builder.addBulletItem('Attendees modified', 0, { ...STYLES.normal, bold: true });
      }
      if (differences.mainTimeSlotChanged) {
        builder.addBulletItem('Main Time Slot changed', 0, { ...STYLES.normal, bold: true });
      }
      if (differences.otherTimeSlotsChanged) {
        builder.addBulletItem('Other Country Times changed', 0, { ...STYLES.normal, bold: true });
      }
      if (differences.structureChanges.size > 0) {
        builder.addBulletItem(
          `${differences.structureChanges.size} Agenda Items modified`,
          0,
          { ...STYLES.normal, bold: true }
        );
      }
      
      builder.addNewline();
    }
  }
  
  // Meeting Attachments
  if (mom.meetingAttachments && mom.meetingAttachments.length > 0) {
    builder.addParagraph('Meeting Attachments:', STYLES.heading1);
    
    mom.meetingAttachments.forEach((attachment, index) => {
      if (attachment.mimeType === 'text/url') {
        builder.addParagraph(
          `${index + 1}. ${attachment.fileName}`,
          STYLES.url,
          { indentStart: { magnitude: 18, unit: 'PT' } }
        );
      } else {
        let attachmentText = `${index + 1}. ${attachment.fileName || 'Unnamed file'}`;
        if (attachment.fileSize && attachment.fileSize > 0) {
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(attachment.fileSize) / Math.log(k));
          const fileSize = parseFloat((attachment.fileSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
          attachmentText += ` (${fileSize})`;
        }
        builder.addParagraph(
          attachmentText,
          STYLES.normal,
          { indentStart: { magnitude: 18, unit: 'PT' } }
        );
      }
    });
    
    builder.addNewline();
  }
  
  // Agenda
  if (mom.structure.length > 0) {
    builder.addParagraph('Agenda:', STYLES.heading1);
    builder.addNewline();
    
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    addStructureToGoogleDocs(builder, numberedStructure, 0, mom.revision);
  }
  
  // Footer
  builder.addNewline();
  builder.addParagraph(
    `Generated on ${new Date().toLocaleString()}`,
    STYLES.small
  );
  
  return builder.getRequests();
}

/**
 * Export to Google Docs via Google Docs API
 * This function handles the actual API integration
 */
export async function exportToGoogleDocs(
  mom: MOM,
  accessToken: string
): Promise<{ documentId: string; documentUrl: string }> {
  // Create a new Google Doc
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: generateGoogleDocsFilename(mom)
    })
  });
  
  if (!createResponse.ok) {
    throw new Error(`Failed to create Google Doc: ${createResponse.statusText}`);
  }
  
  const doc = await createResponse.json();
  const documentId = doc.documentId;
  
  // Get the requests to populate the document
  const requests = exportToGoogleDocsRequests(mom);
  
  // Update the document with content
  const updateResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests })
    }
  );
  
  if (!updateResponse.ok) {
    throw new Error(`Failed to update Google Doc: ${updateResponse.statusText}`);
  }
  
  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`
  };
}

/**
 * Export to Google Docs without authentication (for client-side generation)
 * This creates a Google Docs-compatible HTML that can be imported
 */
export function exportToGoogleDocsHTML(mom: MOM): string {
  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${generateGoogleDocsFilename(mom)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Noto Sans JP", "Noto Sans Thai", Arial, sans-serif; margin: 40px; line-height: 1.6; }
.title { font-size: 20pt; font-weight: bold; margin-bottom: 10px; }
.heading1 { font-size: 16pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
.heading2 { font-size: 14pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; }
.heading3 { font-size: 12pt; font-weight: bold; margin-top: 12px; margin-bottom: 6px; }
.normal { font-size: 11pt; margin-bottom: 5px; }
.small { font-size: 10pt; color: #666; }
.url { font-size: 9pt; color: #0066CC; text-decoration: underline; }
.translation { font-size: 10pt; color: #666; font-style: italic; margin-left: 20px; }
.revision { color: #CC0000; font-weight: bold; }
.action { font-size: 12pt; font-weight: bold; color: #0066CC; }
.action-content { color: #0066CC; font-weight: bold; }
.text-red-600 { color: #DC2626; }
.indent1 { margin-left: 20px; }
.indent2 { margin-left: 40px; }
.indent3 { margin-left: 60px; }
.indent4 { margin-left: 80px; }
.metadata { margin-bottom: 5px; }
ul { margin: 10px 0; padding-left: 30px; }
li { margin: 5px 0; }
img { display: block; margin: 10px 0; }
video { display: block; margin: 10px 0; }
</style>
</head>
<body>`;

  // Title - show only translations
  if (mom.titleTranslations) {
    html += `<h1 class="title">MOM: ${escapeHtml(mom.titleTranslations.en)}</h1>`;
    html += `<div class="translation">JA: ${escapeHtml(mom.titleTranslations.ja)}</div>`;
    html += `<div class="translation">TH: ${escapeHtml(mom.titleTranslations.th)}</div>`;
  } else {
    // Fallback to original if no translations
    html += `<h1 class="title">MOM: ${escapeHtml(mom.title)}</h1>`;
  }
  
  // Meeting Goal - show only translations
  if (mom.goal && mom.goalTranslations) {
    html += `<h2 class="heading1">Meeting Goal: ${escapeHtml(mom.goalTranslations.en)}</h2>`;
    html += `<p class="normal indent1">JA: ${escapeHtml(mom.goalTranslations.ja)}</p>`;
    html += `<p class="normal indent1">TH: ${escapeHtml(mom.goalTranslations.th)}</p>`;
  } else if (mom.goal) {
    // Fallback to original if no translations
    html += `<h2 class="heading1">Meeting Goal:</h2>`;
    html += `<p class="normal indent1">${escapeHtml(mom.goal)}</p>`;
  }
  
  // Metadata - displayed horizontally
  html += `<p class="metadata"><strong>MOM ID:</strong> ${escapeHtml(mom.momId)} | <strong>Revision:</strong> ${mom.revision} | <strong>Date:</strong> ${escapeHtml(mom.date)} | <strong>Status:</strong> ${escapeHtml(mom.status)}</p>`;
  
  // Time Slots - displayed horizontally
  if (mom.mainTimeSlot) {
    let timeStr = `<strong>Time:</strong> ${escapeHtml(mom.mainTimeSlot.country)} (${escapeHtml(mom.mainTimeSlot.timezone)}): ${escapeHtml(mom.mainTimeSlot.startTime)} - ${escapeHtml(mom.mainTimeSlot.endTime)}`;
    
    if (mom.otherTimeSlots && mom.otherTimeSlots.length > 0) {
      mom.otherTimeSlots.forEach(slot => {
        timeStr += ` | ${escapeHtml(slot.country)} (${escapeHtml(slot.timezone)}): ${escapeHtml(slot.startTime)} - ${escapeHtml(slot.endTime)}`;
      });
    }
    
    html += `<p class="normal">${timeStr}</p>`;
  }
  
  // Meeting URLs
  if (mom.urls && mom.urls.length > 0) {
    html += `<h2 class="heading1">Meeting URLs:</h2>`;
    html += '<div style="margin-left: 20px;">';
    mom.urls.forEach((url, index) => {
      html += `<p style="margin: 5px 0;">${index + 1}. <a href="${escapeHtml(url)}" target="_blank" class="url">${escapeHtml(url)}</a></p>`;
    });
    html += '</div>';
  }
  
  // Companies and Attendees
  if (mom.companies.length > 0) {
    html += `<h2 class="heading1">Companies and Attendees:</h2>`;
    html += '<ul>';
    
    mom.companies.forEach(company => {
      const companyAttendees = mom.attendees.filter(a => a.companyId === company.id);
      const attendeeNames = companyAttendees.length > 0
        ? companyAttendees.map(a => a.name).join(' , ')
        : '(No attendees)';
      
      html += `<li>${escapeHtml(company.name)} : ${escapeHtml(attendeeNames)}</li>`;
    });
    
    html += '</ul>';
  }
  
  // Meeting Attachments
  if (mom.meetingAttachments && mom.meetingAttachments.length > 0) {
    html += `<h2 class="heading1">Meeting Attachments:</h2>`;
    html += '<div style="margin-left: 20px;">';
    
    mom.meetingAttachments.forEach((attachment, index) => {
      if (attachment.mimeType === 'text/url') {
        html += `<p style="margin: 5px 0;"><a href="${escapeHtml(attachment.data)}" target="_blank" class="url">${escapeHtml(attachment.fileName || 'URL')}</a></p>`;
      } else {
        // Check if attachment has data (either base64 or URL)
        const src = attachment.driveUrl || attachment.data;
        
        if (attachment.type === 'image' || (attachment.mimeType && attachment.mimeType.startsWith('image/'))) {
          // Display images inline
          html += `<div style="margin: 15px 0;">`;
          html += `<p style="margin-bottom: 5px;"><strong>${escapeHtml(attachment.fileName || 'Image')}</strong>`;
          if (attachment.fileSize && attachment.fileSize > 0) {
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(attachment.fileSize) / Math.log(k));
            const fileSize = parseFloat((attachment.fileSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            html += ` (${fileSize})`;
          }
          html += `</p>`;
          if (src) {
            html += `<img src="${src}" style="max-width: 100%; max-height: 600px; border: 1px solid #ddd; border-radius: 4px;" alt="${escapeHtml(attachment.fileName || 'Image')}" />`;
          }
          html += `</div>`;
        } else if (attachment.type === 'video' || (attachment.mimeType && attachment.mimeType.startsWith('video/'))) {
          // Display videos inline
          html += `<div style="margin: 15px 0;">`;
          html += `<p style="margin-bottom: 5px;"><strong>${escapeHtml(attachment.fileName || 'Video')}</strong>`;
          if (attachment.fileSize && attachment.fileSize > 0) {
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(attachment.fileSize) / Math.log(k));
            const fileSize = parseFloat((attachment.fileSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            html += ` (${fileSize})`;
          }
          html += `</p>`;
          if (src) {
            html += `<video controls style="max-width: 100%; max-height: 600px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += `<source src="${src}" type="${attachment.mimeType || 'video/mp4'}">`;
            html += `Your browser does not support the video tag.`;
            html += `</video>`;
          }
          html += `</div>`;
        } else {
          // For other file types, show as link
          let attachmentText = `${attachment.fileName || 'File'}`;
          if (attachment.fileSize && attachment.fileSize > 0) {
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(attachment.fileSize) / Math.log(k));
            const fileSize = parseFloat((attachment.fileSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            attachmentText += ` (${fileSize})`;
          }
          if (src) {
            html += `<p style="margin: 5px 0;"><a href="${src}" target="_blank" style="color: #0066CC;">📎 ${escapeHtml(attachmentText)}</a></p>`;
          } else {
            html += `<p style="margin: 5px 0;">📎 ${escapeHtml(attachmentText)}</p>`;
          }
        }
      }
    });
    
    html += '</div>';
  }
  
  // Revision comparison
  if (mom.revision > 0 && mom.previousRevisionData) {
    const differences = compareMOMs(mom, mom.previousRevisionData);
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
    
    if (changes.length > 0) {
      html += `<h2 class="heading1">Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1}):</h2>`;
      html += '<ul>';
      changes.forEach(change => {
        html += `<li><strong>${escapeHtml(change)}</strong></li>`;
      });
      html += '</ul>';
    }
  }
  
  // Agenda
  if (mom.structure.length > 0) {
    html += `<h2 class="heading1">Agenda:</h2>`;
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    html += generateStructureHTML(numberedStructure, 0, mom.revision);
  }
  
  // Footer
  html += `<p class="small" style="margin-top: 40px;">Generated on ${new Date().toLocaleString()}</p>`;
  html += '</body></html>';
  
  return html;
}

/**
 * Generate HTML for structure items
 */
function generateStructureHTML(
  items: StructureItem[],
  indentLevel: number,
  currentRevision?: number
): string {
  let html = '';
  
  items.forEach(item => {
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    const headingTag = item.level <= 2 ? 'h3' : 'h4';
    const headingClass = item.level <= 2 ? 'heading2' : (item.level === 4 ? 'action' : 'heading3');
    const indentClass = `indent${Math.min(indentLevel, 4)}`;
    
    const titleClass = isModified ? `${headingClass} ${indentClass} revision` : `${headingClass} ${indentClass}`;
    
    // Show only translations
    if (item.translations) {
      if (item.level === 1) {
        // Main Title - use inline format
        html += `<${headingTag} class="${titleClass}">${escapeHtml(item.number)} ${escapeHtml(item.translations.en)} | JA: ${escapeHtml(item.translations.ja)} | TH: ${escapeHtml(item.translations.th)}</${headingTag}>`;
      } else {
        // Sub Title and below - show EN next to number, then JA and TH on separate lines
        html += `<${headingTag} class="${titleClass}">${escapeHtml(item.number)} ${escapeHtml(item.translations.en)}</${headingTag}>`;
        const translationIndentClass = `indent${Math.min(indentLevel + 1, 4)}`;
        html += `<div class="translation ${translationIndentClass}">JA: ${escapeHtml(item.translations.ja)}</div>`;
        html += `<div class="translation ${translationIndentClass}">TH: ${escapeHtml(item.translations.th)}</div>`;
      }
    } else {
      // Fallback to original if no translations
      html += `<${headingTag} class="${titleClass}">${escapeHtml(item.number)} ${escapeHtml(item.title)}</${headingTag}>`;
    }
    
    // URLs for all levels
    if (item.urls && item.urls.length > 0) {
      const detailIndentClass = `indent${Math.min(indentLevel + 1, 4)}`;
      html += `<p class="normal ${detailIndentClass}"><strong>URLs:</strong></p>`;
      item.urls.forEach(url => {
        html += `<p class="url ${detailIndentClass}"><a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a></p>`;
      });
    }
    
    // Attachments for all levels
    if (item.attachments && item.attachments.length > 0) {
      const detailIndentClass = `indent${Math.min(indentLevel + 1, 4)}`;
      html += `<div class="${detailIndentClass}" style="margin-top: 10px;">`;
      html += `<p class="normal"><strong>Attachments:</strong></p>`;
      
      item.attachments.forEach((attachment: any) => {
        const src = attachment.annotations || attachment.blobUrl || attachment.driveUrl || attachment.data;
        if (src) {
          if (attachment.type === 'image') {
            html += `<div style="margin: 10px 0;">`;
            html += `<img src="${src}" style="max-width: 100%; max-height: 600px; border: 1px solid #ddd; border-radius: 4px;" alt="${escapeHtml(attachment.fileName || 'Image')}" />`;
            if (attachment.fileName) {
              html += `<p style="font-size: 0.9em; color: #666; margin-top: 5px;">${escapeHtml(attachment.fileName)}</p>`;
            }
            html += `</div>`;
          } else if (attachment.type === 'video') {
            html += `<div style="margin: 10px 0;">`;
            html += `<video controls style="max-width: 100%; max-height: 600px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += `<source src="${src}" type="video/mp4">`;
            html += `Your browser does not support the video tag.`;
            html += `</video>`;
            html += `</div>`;
          } else if (attachment.type === 'pdf') {
            html += `<p style="margin: 10px 0;"><a href="${src}" target="_blank" class="url">${escapeHtml(attachment.fileName || 'PDF Document')}</a></p>`;
          }
        }
      });
      
      html += `</div>`;
    }
    
    // Level 4 items
    if (item.level === 4) {
      const detailIndentClass = `indent${Math.min(indentLevel + 1, 4)}`;
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        const names = item.responsibleParties.map(p => p.name).join(', ');
        html += `<p class="action-content ${detailIndentClass}"><strong>Responsible:</strong> ${escapeHtml(names)}</p>`;
      }
      
      if (item.dueDate) {
        html += `<p class="action-content ${detailIndentClass}"><strong>Due Date:</strong> ${escapeHtml(item.dueDate)}</p>`;
      }
      
      if (item.status) {
        const statusClass = item.status === 'open' ? 'text-red-600 font-bold' : 'action-content';
        html += `<p class="${statusClass} ${detailIndentClass}"><strong>Status:</strong> ${escapeHtml(item.status.toUpperCase())}</p>`;
      }
      
      if (item.urls && item.urls.length > 0) {
        html += `<p class="normal ${detailIndentClass}"><strong>URLs:</strong></p>`;
        item.urls.forEach(url => {
          html += `<p class="url ${detailIndentClass}"><a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a></p>`;
        });
      }
      
      if (item.attachments && item.attachments.length > 0) {
        html += `<div class="${detailIndentClass}" style="margin-top: 10px;">`;
        html += `<p class="normal"><strong>Attachments:</strong></p>`;
        
        item.attachments.forEach((attachment: any) => {
          // Check if attachment has data (either base64 or URL)
          if (attachment.data || attachment.driveUrl) {
            const src = attachment.driveUrl || attachment.data;
            
            if (attachment.type === 'image') {
              // Display images inline
              html += `<div style="margin: 10px 0;">`;
              html += `<img src="${src}" style="max-width: 100%; max-height: 600px; border: 1px solid #ddd; border-radius: 4px;" alt="Attachment" />`;
              if (attachment.annotations) {
                // If image has annotations, show the annotated version
                html += `<img src="${attachment.annotations}" style="max-width: 100%; max-height: 600px; border: 1px solid #ddd; border-radius: 4px; margin-top: 10px;" alt="Annotated" />`;
              }
              html += `</div>`;
            } else if (attachment.type === 'video') {
              // Display videos inline
              html += `<div style="margin: 10px 0;">`;
              html += `<video controls style="max-width: 100%; max-height: 600px; border: 1px solid #ddd; border-radius: 4px;">`;
              html += `<source src="${src}" type="video/mp4">`;
              html += `<source src="${src}" type="video/webm">`;
              html += `Your browser does not support the video tag.`;
              html += `</video>`;
              html += `</div>`;
            } else {
              // For other file types, show as link
              html += `<p style="margin: 5px 0;"><a href="${src}" target="_blank" style="color: #0066CC;">📎 View attachment</a></p>`;
            }
          }
        });
        
        html += `</div>`;
      }
    }
    
    // Process children
    if (item.children && item.children.length > 0) {
      html += generateStructureHTML(item.children, indentLevel + 1, currentRevision);
    }
  });
  
  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  // Use a simple string replacement approach that works both client and server side
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}