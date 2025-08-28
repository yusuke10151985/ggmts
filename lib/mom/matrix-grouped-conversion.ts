/**
 * Matrix conversion with grouped display for hierarchical items
 */

import { StructureItem, MatrixRow, ResponsibleParty, Attachment, Translation } from '@/types/mom';

export interface GroupedMatrixRow {
  id: string;
  mainTitleId: string;
  mainTitle: string;
  mainTranslations?: Translation;
  
  // Sub-items grouped under this main title
  subItems: {
    id: string;
    level: 2 | 3 | 4;
    rowNumber: string;
    subTitle?: string;
    subSubTitle?: string;
    action?: string;
    translations?: Translation;
    responsible?: ResponsibleParty[];
    dueDate?: string;
    status?: 'open' | 'closed';
    urls?: string[];
    attachments?: Attachment[];
    structureItemId: string;
  }[];
  
  // For display purposes
  rowSpan: number; // How many rows this main title spans
}

/**
 * Converts hierarchical structure to grouped matrix rows
 * Groups all items under the same Main Title into a single row group
 */
export function structureToGroupedMatrix(items: StructureItem[]): GroupedMatrixRow[] {
  const groupedRows: GroupedMatrixRow[] = [];
  
  items.forEach(mainItem => {
    if (mainItem.level !== 1) return; // Only process main titles at root
    
    const group: GroupedMatrixRow = {
      id: mainItem.id,
      mainTitleId: mainItem.id,
      mainTitle: mainItem.title,
      mainTranslations: mainItem.translations,
      subItems: [],
      rowSpan: 1
    };
    
    // Collect all descendants
    function collectDescendants(item: StructureItem, parentNumbers: number[] = []) {
      const currentNumber = [...parentNumbers, item.children.length > 0 ? 1 : 0];
      
      item.children.forEach((child, index) => {
        const childNumbers = [...parentNumbers, index + 1];
        
        if (child.level === 2) {
          // Sub Title
          group.subItems.push({
            id: child.id,
            level: 2,
            rowNumber: child.hierarchicalNumber,
            subTitle: child.title,
            translations: child.translations,
            urls: child.urls || [],
            attachments: child.attachments || [],
            structureItemId: child.id
          });
        } else if (child.level === 3) {
          // Sub Sub Title
          group.subItems.push({
            id: child.id,
            level: 3,
            rowNumber: child.hierarchicalNumber,
            subSubTitle: child.title,
            translations: child.translations,
            urls: child.urls || [],
            attachments: child.attachments || [],
            structureItemId: child.id
          });
        } else if (child.level === 4) {
          // Action
          group.subItems.push({
            id: child.id,
            level: 4,
            rowNumber: child.hierarchicalNumber,
            action: child.title,
            translations: child.translations,
            responsible: child.responsibleParties,
            dueDate: child.dueDate,
            status: child.status,
            urls: child.urls || [],
            attachments: child.attachments || [],
            structureItemId: child.id
          });
        }
        
        // Recursively collect from children
        collectDescendants(child, childNumbers);
      });
    }
    
    collectDescendants(mainItem, [parseInt(mainItem.number) || 1]);
    
    // Calculate rowSpan (at least 1 for the main title itself)
    group.rowSpan = Math.max(1, group.subItems.length);
    
    groupedRows.push(group);
  });
  
  return groupedRows;
}

/**
 * Expands grouped matrix rows into flat matrix rows for compatibility
 */
export function expandGroupedMatrix(groupedRows: GroupedMatrixRow[]): MatrixRow[] {
  const flatRows: MatrixRow[] = [];
  
  groupedRows.forEach(group => {
    // Add main title row
    flatRows.push({
      id: group.id,
      rowNumber: group.mainTitle.split('.')[0] || '1',
      level: 1,
      mainTitle: group.mainTitle,
      subTitle: '',
      subSubTitle: '',
      action: '',
      responsible: [],
      dueDate: '',
      status: '',
      urls: [],
      attachments: [],
      translations: group.mainTranslations,
      parentId: null,
      hasChildren: group.subItems.length > 0,
      depth: 0,
      structureItemId: group.mainTitleId
    });
    
    // Add sub-items
    group.subItems.forEach(subItem => {
      flatRows.push({
        id: subItem.id,
        rowNumber: subItem.rowNumber,
        level: subItem.level,
        mainTitle: '',
        subTitle: subItem.subTitle || '',
        subSubTitle: subItem.subSubTitle || '',
        action: subItem.action || '',
        responsible: subItem.responsible || [],
        dueDate: subItem.dueDate || '',
        status: subItem.status || '',
        urls: subItem.urls || [],
        attachments: subItem.attachments || [],
        translations: subItem.translations,
        parentId: group.id,
        hasChildren: false,
        depth: subItem.level - 1,
        structureItemId: subItem.structureItemId
      });
    });
  });
  
  return flatRows;
}