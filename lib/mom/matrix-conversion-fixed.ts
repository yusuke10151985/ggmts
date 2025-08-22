/**
 * Fixed matrix conversion utilities for proper hierarchical display with gap handling
 */

import { StructureItem, MatrixRow, ResponsibleParty, Attachment } from '@/types/mom';

/**
 * Converts hierarchical structure to matrix rows
 * Properly maintains hierarchical order and gap numbering
 */
export function structureToMatrix(items: StructureItem[]): MatrixRow[] {
  const rows: MatrixRow[] = [];
  
  // Recursive function to process items in hierarchical order
  function processItem(item: StructureItem, parentTitles: { main: string; sub: string; subSub: string }) {
    // Use the item's hierarchicalNumber directly
    const rowNumber = item.hierarchicalNumber || item.number || '';
    const numberParts = rowNumber.split('.').map(Number);
    
    // Determine parent titles based on level and gaps
    let mainTitle = '';
    let subTitle = '';
    let subSubTitle = '';
    
    if (item.level === 1) {
      mainTitle = item.title;
    } else if (item.level === 2) {
      mainTitle = parentTitles.main;
      subTitle = item.title;
    } else if (item.level === 3) {
      mainTitle = parentTitles.main;
      // Check if Sub was skipped (second number part is 0)
      if (numberParts.length >= 2 && numberParts[1] === 0) {
        subTitle = ''; // Skipped
      } else {
        subTitle = parentTitles.sub;
      }
      subSubTitle = item.title;
    } else if (item.level === 4) {
      mainTitle = parentTitles.main;
      
      // Check for skipped levels
      const hasSkippedSub = numberParts.length >= 2 && numberParts[1] === 0;
      const hasSkippedSubSub = numberParts.length >= 3 && numberParts[2] === 0;
      
      if (hasSkippedSub) {
        subTitle = ''; // Skipped
        subSubTitle = ''; // Also skipped if sub is skipped
      } else {
        subTitle = parentTitles.sub;
        if (hasSkippedSubSub) {
          subSubTitle = ''; // Skipped
        } else {
          subSubTitle = parentTitles.subSub;
        }
      }
    }
    
    // Create matrix row
    const row: MatrixRow = {
      id: item.id,
      rowNumber,
      level: item.level,
      
      // Content based on level - use the actual number of parts to determine the real level
      // This handles cases where level might be incorrect due to skipped levels
      mainTitle: numberParts.length === 1 ? item.title : '',
      subTitle: numberParts.length === 2 ? item.title : '',
      subSubTitle: numberParts.length === 3 ? item.title : '',
      action: numberParts.length === 4 ? item.title : '',
      
      // Metadata
      responsible: item.responsibleParties || [],
      dueDate: item.dueDate || '',
      status: item.status || '',
      
      // Attachments
      urls: item.urls || [],
      attachments: item.attachments || [],
      
      // Translations
      translations: item.translations,
      
      // Hierarchy helpers
      parentId: null, // Will be set if needed
      hasChildren: item.children.length > 0,
      depth: numberParts.length - 1,
      
      // Reference
      structureItemId: item.id
    };
    
    rows.push(row);
    
    // Update parent titles for children
    const newParentTitles = {
      main: item.level === 1 ? item.title : parentTitles.main,
      sub: item.level === 2 ? item.title : parentTitles.sub,
      subSub: item.level === 3 ? item.title : parentTitles.subSub
    };
    
    // Process children in their original order
    // Sort children by level first to ensure proper display order
    const sortedChildren = [...item.children].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      // Maintain order within same level
      return item.children.indexOf(a) - item.children.indexOf(b);
    });
    
    sortedChildren.forEach(child => {
      processItem(child, newParentTitles);
    });
  }
  
  // Process all root items
  items.forEach(item => {
    processItem(item, { main: '', sub: '', subSub: '' });
  });
  
  return rows;
}

/**
 * Helper function to find parent item in hierarchical structure
 */
function findParentItem(items: StructureItem[], targetItem: StructureItem): StructureItem | null {
  for (const item of items) {
    if (item.children.some(child => child.id === targetItem.id)) {
      return item;
    }
    
    const foundInChildren = findParentItem(item.children, targetItem);
    if (foundInChildren) {
      return foundInChildren;
    }
  }
  
  return null;
}

/**
 * Converts matrix rows back to hierarchical structure
 */
export function matrixToStructure(rows: MatrixRow[]): StructureItem[] {
  const itemMap = new Map<string, StructureItem>();
  const rootItems: StructureItem[] = [];
  
  // First pass: Create all items
  rows.forEach(row => {
    const item: StructureItem = {
      id: row.structureItemId,
      level: row.level,
      number: row.rowNumber,
      hierarchicalNumber: row.rowNumber,
      title: row.level === 1 ? row.mainTitle :
             row.level === 2 ? row.subTitle :
             row.level === 3 ? row.subSubTitle :
             row.action,
      children: [],
      translations: row.translations,
      urls: row.urls,
      attachments: row.attachments,
      ...(row.level === 4 ? {
        actionId: `ACT-${row.id}`, // Generate if needed
        responsibleParties: row.responsible,
        dueDate: row.dueDate,
        status: row.status as 'open' | 'closed' | undefined,
      } : {})
    };
    
    itemMap.set(row.id, item);
  });
  
  // Second pass: Build hierarchy based on hierarchical numbers
  rows.forEach(row => {
    const item = itemMap.get(row.id);
    if (!item) return;
    
    const numberParts = row.rowNumber.split('.');
    
    if (numberParts.length === 1) {
      // Root level
      rootItems.push(item);
    } else {
      // Find parent based on hierarchical number
      let parentNumber = numberParts.slice(0, -1).join('.');
      
      // Find parent by matching hierarchical number
      let parentItem: StructureItem | undefined = undefined;
      
      for (const potentialParentRow of rows) {
        if (potentialParentRow.rowNumber === parentNumber) {
          const foundItem = itemMap.get(potentialParentRow.id);
          if (foundItem) {
            parentItem = foundItem;
            break;
          }
        }
      }
      
      if (parentItem) {
        parentItem.children.push(item);
      } else {
        // If no direct parent found (due to gaps), find the nearest ancestor
        while (parentNumber.includes('.') && !parentItem) {
          parentNumber = parentNumber.substring(0, parentNumber.lastIndexOf('.'));
          for (const potentialParentRow of rows) {
            if (potentialParentRow.rowNumber === parentNumber) {
              const foundItem = itemMap.get(potentialParentRow.id);
              if (foundItem) {
                parentItem = foundItem;
                break;
              }
            }
          }
        }
        
        if (parentItem) {
          parentItem.children.push(item);
        } else {
          // Orphaned item, add to root
          rootItems.push(item);
        }
      }
    }
  });
  
  return rootItems;
}

// Re-export other functions from the original file
export { updateMatrixRow, addMatrixRow, removeMatrixRow } from './matrix-conversion';