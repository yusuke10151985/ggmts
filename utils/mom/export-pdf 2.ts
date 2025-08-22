// **PDF UTF-8 FIX**: New PDF export implementation using html2canvas for proper UTF-8 support
import { MOM, StructureItem } from '@/types/mom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getRevisionHexColor, isModifiedInRevision, compareMOMs } from '@/lib/mom/revision-utils';
import { generateHierarchicalNumbers } from '@/lib/mom/numbering-utils';

/**
 * Creates an HTML element with the MOM content for rendering
 */
function createMOMHTML(mom: MOM): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 794px;
    padding: 40px;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
  `;

  // Title
  const title = document.createElement('h1');
  title.style.cssText = 'font-size: 24px; margin-bottom: 20px; color: #000;';
  // **TRANSLATION IN PDF**: Include translations in title
  if (mom.titleTranslations) {
    title.innerHTML = `MOM: ${mom.title}<br>
      <span style="font-size: 14px; color: #666;">
        EN: ${mom.titleTranslations.en} | JA: ${mom.titleTranslations.ja} | TH: ${mom.titleTranslations.th}
      </span>`;
  } else {
    title.textContent = `MOM: ${mom.title}`;
  }
  container.appendChild(title);

  // **MEETING GOAL**: Include goal if present
  if (mom.goal) {
    const goal = document.createElement('div');
    goal.style.cssText = 'margin-bottom: 20px; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;';
    let goalHtml = `<p style="font-size: 16px; margin: 0;"><strong>Meeting Goal:</strong> ${mom.goal}</p>`;
    if (mom.goalTranslations) {
      goalHtml += `<p style="font-size: 12px; color: #666; margin-top: 5px;">
        EN: ${mom.goalTranslations.en} | JA: ${mom.goalTranslations.ja} | TH: ${mom.goalTranslations.th}
      </p>`;
    }
    goal.innerHTML = goalHtml;
    container.appendChild(goal);
  }

  // Metadata
  const metadata = document.createElement('div');
  metadata.style.cssText = 'margin-bottom: 20px; font-size: 14px;';
  metadata.innerHTML = `
    <p><strong>MOM ID:</strong> ${mom.momId}</p>
    <p><strong>Revision:</strong> ${mom.revision}</p>
    <p><strong>Date:</strong> ${mom.date}</p>
    <p><strong>Status:</strong> ${mom.status}</p>
  `;
  container.appendChild(metadata);

  // **Companies and Attendees 形式修正**
  // 以前の実装: CompaniesとAttendeesが別々のセクションで表示されていた
  // 問題点: 会社と参加者の関係が分かりにくく、冗長な表示になっていた
  // 解決策: 会社ごとに参加者をグループ化し、1行に「Company : Attendee1, Attendee2」形式で表示
  if (mom.companies.length > 0) {
    const companiesSection = document.createElement('div');
    companiesSection.style.cssText = 'margin-bottom: 20px;';
    companiesSection.innerHTML = '<h2 style="font-size: 18px; margin-bottom: 10px;">Companies and Attendees:</h2>';
    
    const companiesList = document.createElement('div');
    // **フォントサイズを1段階小さく**: 14px -> 13pxに変更
    companiesList.style.cssText = 'margin-left: 20px; font-size: 13px;';
    
    // 会社ごとに参加者をグループ化
    mom.companies.forEach(company => {
      // その会社に所属する参加者を取得
      const companyAttendees = mom.attendees.filter(attendee => attendee.companyId === company.id);
      
      if (companyAttendees.length > 0) {
        const companyLine = document.createElement('p');
        companyLine.style.cssText = 'margin: 5px 0;';
        // **形式**: Company : Attendee1, Attendee2
        const attendeeNames = companyAttendees.map(a => a.name).join(' , ');
        companyLine.textContent = `${company.name} : ${attendeeNames}`;
        companiesList.appendChild(companyLine);
      } else {
        // 参加者がいない会社も表示
        const companyLine = document.createElement('p');
        companyLine.style.cssText = 'margin: 5px 0;';
        companyLine.textContent = `${company.name} : (No attendees)`;
        companiesList.appendChild(companyLine);
      }
    });
    
    companiesSection.appendChild(companiesList);
    container.appendChild(companiesSection);
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
      const diffSection = document.createElement('div');
      diffSection.style.cssText = 'margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border: 2px solid #ddd; border-radius: 8px;';
      diffSection.innerHTML = `<h2 style="font-size: 18px; margin-bottom: 10px;">Changes in Rev.${mom.revision} (compared to Rev.${mom.revision - 1})</h2>`;
      
      const changesList = document.createElement('ul');
      changesList.style.cssText = 'margin-left: 20px; list-style-type: disc;';
      
      if (differences.titleChanged) {
        const li = document.createElement('li');
        li.innerHTML = '<span style="font-weight: bold;">Meeting Title</span> changed';
        changesList.appendChild(li);
      }
      
      if (differences.goalChanged) {
        const li = document.createElement('li');
        li.innerHTML = '<span style="font-weight: bold;">Meeting Goal</span> changed';
        changesList.appendChild(li);
      }
      
      if (differences.dateChanged) {
        const li = document.createElement('li');
        li.innerHTML = '<span style="font-weight: bold;">Meeting Date</span> changed';
        changesList.appendChild(li);
      }
      
      if (differences.companiesChanged) {
        const li = document.createElement('li');
        li.innerHTML = '<span style="font-weight: bold;">Companies</span> modified';
        changesList.appendChild(li);
      }
      
      if (differences.attendeesChanged) {
        const li = document.createElement('li');
        li.innerHTML = '<span style="font-weight: bold;">Attendees</span> modified';
        changesList.appendChild(li);
      }
      
      if (differences.mainTimeSlotChanged) {
        const li = document.createElement('li');
        li.innerHTML = '<span style="font-weight: bold;">Main Time Slot</span> changed';
        changesList.appendChild(li);
      }
      
      if (differences.otherTimeSlotsChanged) {
        const li = document.createElement('li');
        li.innerHTML = '<span style="font-weight: bold;">Other Country Times</span> changed';
        changesList.appendChild(li);
      }
      
      if (differences.structureChanges.size > 0) {
        const li = document.createElement('li');
        li.innerHTML = `<span style="font-weight: bold;">${differences.structureChanges.size} Agenda Items</span> modified`;
        changesList.appendChild(li);
      }
      
      diffSection.appendChild(changesList);
      container.appendChild(diffSection);
    }
  }

  // Structure
  if (mom.structure.length > 0) {
    const structureSection = document.createElement('div');
    structureSection.innerHTML = '<h2 style="font-size: 18px; margin-bottom: 10px;">Agenda:</h2>';
    // **階層番号生成**: 1., 1.1., 1.1.1. 形式の番号を生成
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    const structureContent = createStructureHTML(numberedStructure, 0, mom.revision);
    structureSection.appendChild(structureContent);
    container.appendChild(structureSection);
  }

  return container;
}

/**
 * Creates HTML for structure items
 */
function createStructureHTML(items: StructureItem[], indent: number, currentRevision?: number): HTMLDivElement {
  const container = document.createElement('div');
  
  items.forEach(item => {
    const itemDiv = document.createElement('div');
    // **HIERARCHICAL NUMBERING**: Increase indent and add border for visual hierarchy
    const indentSize = indent * 30; // Increased from 20
    const borderLeft = indent > 0 ? 'border-left: 2px solid #e0e0e0; padding-left: 15px;' : '';
    itemDiv.style.cssText = `margin-left: ${indentSize}px; margin-bottom: 12px; ${borderLeft}`;
    
    // Title with clear hierarchical numbering
    const titleEl = document.createElement('p');
    // **HIERARCHICAL NUMBERING**: Use larger font and distinct styling for different levels
    const levelStyles = [
      'font-size: 20px; font-weight: bold; margin-bottom: 8px; color: #1a1a1a;', // Level 1
      'font-size: 18px; font-weight: bold; margin-bottom: 6px; color: #2a2a2a;', // Level 2
      'font-size: 16px; font-weight: bold; margin-bottom: 5px; color: #3a3a3a;', // Level 3
      'font-size: 14px; font-weight: bold; margin-bottom: 4px; color: #4a4a4a;', // Level 4
    ];
    // **リビジョン変更の太字表示**: 変更されたアイテムは更に太く表示
    const isModified = currentRevision && isModifiedInRevision(item, currentRevision);
    const baseStyle = levelStyles[item.level - 1] || levelStyles[3];
    titleEl.style.cssText = isModified 
      ? baseStyle.replace('font-weight: bold', 'font-weight: 900') // 変更されたアイテムは極太
      : baseStyle;
    // **TRANSLATION IN PDF**: Include translations for structure items
    if (item.translations) {
      // **HIERARCHICAL NUMBERING**: Make number more prominent
      titleEl.innerHTML = `<span style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">${item.number}</span>${item.title}<br>
        <span style="font-size: 12px; color: #666; font-weight: normal;">
          EN: ${item.translations.en} | JA: ${item.translations.ja} | TH: ${item.translations.th}
        </span>`;
    } else {
      // **HIERARCHICAL NUMBERING**: Make number more prominent
      const numberSpan = document.createElement('span');
      numberSpan.style.cssText = 'background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; margin-right: 8px;';
      numberSpan.textContent = item.number;
      titleEl.appendChild(numberSpan);
      titleEl.appendChild(document.createTextNode(item.title));
    }
    itemDiv.appendChild(titleEl);
    
    if (item.level === 4) {
      // Action details
      if (item.details) {
        const detailsEl = document.createElement('p');
        detailsEl.style.cssText = 'margin-left: 20px; margin-bottom: 3px; font-size: 14px;';
        // **TRANSLATION IN PDF**: Include detail translations
        if (item.detailsTranslations) {
          detailsEl.innerHTML = `Details: ${item.details}<br>
            <span style="font-size: 12px; color: #666;">
              EN: ${item.detailsTranslations.en} | JA: ${item.detailsTranslations.ja} | TH: ${item.detailsTranslations.th}
            </span>`;
        } else {
          detailsEl.textContent = `Details: ${item.details}`;
        }
        itemDiv.appendChild(detailsEl);
      }
      
      if (item.responsibleParties && item.responsibleParties.length > 0) {
        const responsibleEl = document.createElement('p');
        responsibleEl.style.cssText = 'margin-left: 20px; margin-bottom: 3px; font-size: 14px;';
        responsibleEl.textContent = `Responsible: ${item.responsibleParties.map(p => p.name).join(', ')}`;
        itemDiv.appendChild(responsibleEl);
      }
      
      if (item.dueDate) {
        const dueDateEl = document.createElement('p');
        dueDateEl.style.cssText = 'margin-left: 20px; margin-bottom: 3px; font-size: 14px;';
        dueDateEl.textContent = `Due Date: ${item.dueDate}`;
        itemDiv.appendChild(dueDateEl);
      }
      
      if (item.status) {
        const statusEl = document.createElement('p');
        statusEl.style.cssText = 'margin-left: 20px; margin-bottom: 3px; font-size: 14px;';
        statusEl.textContent = `Status: ${item.status.toUpperCase()}`;
        itemDiv.appendChild(statusEl);
      }
      
      if (item.urls && item.urls.length > 0) {
        const urlsEl = document.createElement('div');
        urlsEl.style.cssText = 'margin-left: 20px; margin-bottom: 3px; font-size: 14px;';
        urlsEl.innerHTML = '<p>URLs:</p>';
        item.urls.forEach(url => {
          const urlP = document.createElement('p');
          urlP.style.cssText = 'margin-left: 10px;';
          urlP.textContent = `- ${url}`;
          urlsEl.appendChild(urlP);
        });
        itemDiv.appendChild(urlsEl);
      }
      
      // Images will be handled separately in the original function
      if (item.attachments && item.attachments.length > 0) {
        const attachEl = document.createElement('p');
        attachEl.style.cssText = 'margin-left: 20px; margin-bottom: 3px; font-size: 14px; color: #666;';
        attachEl.textContent = `[${item.attachments.length} attachment(s) - see below]`;
        itemDiv.appendChild(attachEl);
      }
    }
    
    container.appendChild(itemDiv);
    
    // Process children
    if (item.children.length > 0) {
      const childrenContainer = createStructureHTML(item.children, indent + 1, currentRevision);
      container.appendChild(childrenContainer);
    }
  });
  
  return container;
}

/**
 * Enhanced PDF export with proper UTF-8 support using html2canvas
 */
export async function exportToPDFWithUTF8(mom: MOM): Promise<Blob> {
  // Create HTML content
  const htmlContent = createMOMHTML(mom);
  
  // Temporarily add to DOM for rendering
  htmlContent.style.position = 'absolute';
  htmlContent.style.left = '-9999px';
  document.body.appendChild(htmlContent);
  
  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(htmlContent, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Calculate dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Now add images from attachments
    let currentPage = pdf.getNumberOfPages();
    
    // Function to add attachment images
    const addAttachmentImages = async (items: StructureItem[]) => {
      for (const item of items) {
        if (item.attachments && item.attachments.length > 0) {
          for (const attachment of item.attachments) {
            if (attachment.type === 'image' && attachment.data) {
              try {
                pdf.addPage();
                currentPage++;
                
                // Add title for context
                pdf.setFontSize(12);
                pdf.text(`Attachment for: ${item.number}. ${item.title}`, 20, 20);
                
                // Add image
                const imageData = attachment.annotations || attachment.data;
                pdf.addImage(imageData, 'JPEG', 20, 30, 170, 120, undefined, 'FAST');
              } catch (error) {
                console.error('Error adding attachment image:', error);
              }
            }
          }
        }
        
        // Process children
        if (item.children.length > 0) {
          await addAttachmentImages(item.children);
        }
      }
    };
    
    // Add all attachment images
    // **階層番号生成**: エクスポート用に階層番号を生成
    const numberedStructure = generateHierarchicalNumbers(mom.structure);
    await addAttachmentImages(numberedStructure);
    
    // Return PDF blob
    return pdf.output('blob');
    
  } finally {
    // Clean up
    document.body.removeChild(htmlContent);
  }
}