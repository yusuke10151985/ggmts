/**
 * Matrix conversion utilities for transforming between hierarchical structure and matrix format
 */

import { StructureItem, MatrixRow, ResponsibleParty, Attachment } from '@/types/mom';

/**
 * Converts hierarchical structure to matrix rows
 * Now properly handles gap numbering (0 for skipped levels)
 */
export function structureToMatrix(items: StructureItem[], parentNumber: string = ''): MatrixRow[] {
  const rows: MatrixRow[] = [];
  
  // Process items in their original order to maintain hierarchy
  // Group by level but maintain order within each level
  const levelGroups = new Map<number, StructureItem[]>();
  items.forEach(item => {
    if (!levelGroups.has(item.level)) {
      levelGroups.set(item.level, []);
    }
    levelGroups.get(item.level)!.push(item);
  });
  
  // Process items maintaining their hierarchy
  items.forEach((item) => {
    // Always use the item's hierarchicalNumber if available
    const rowNumber = item.hierarchicalNumber || item.number || '';
    
    // Create matrix row from structure item
    const row: MatrixRow = {
      id: item.id,
      rowNumber,
      level: item.level,
      
      // Content based on level
      mainTitle: item.level === 1 ? item.title : '',
      subTitle: item.level === 2 ? item.title : '',
      subSubTitle: item.level === 3 ? item.title : '',
      action: item.level === 4 ? item.title : '',
      
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
      parentId: null, // Will be set below
      hasChildren: item.children.length > 0,
      depth: (parentNumber.split('.').length - 1) + (parentNumber ? 1 : 0),
      
      // Reference
      structureItemId: item.id
    };
    
    // Set parent titles based on hierarchy with gap handling
    // Parse the hierarchical number to understand the structure
    const numberParts = rowNumber.split('.').map(Number);
    
    if (item.level > 1) {
      // Find the actual parent based on hierarchical structure
      const parentItem = findParentItem(items, item);
      if (parentItem) {
        row.parentId = parentItem.id;
        
        // Set titles based on number parts (0 means level was skipped)
        if (item.level === 2) {
          row.mainTitle = parentItem.title;
        } else if (item.level === 3) {
          // Check if Sub level was skipped (second part is 0)
          if (numberParts.length >= 2 && numberParts[1] === 0) {
            // Direct child of Main
            row.mainTitle = parentItem.title;
            row.subTitle = ''; // Skipped
          } else {
            // Normal hierarchy through Sub
            row.subTitle = parentItem.title;
            const grandParent = findParentItem(items, parentItem);
            if (grandParent) {
              row.mainTitle = grandParent.title;
            }
          }
        } else if (item.level === 4) {
          // Determine which levels were skipped
          const hasSkippedSub = numberParts.length >= 2 && numberParts[1] === 0;
          const hasSkippedSubSub = numberParts.length >= 3 && numberParts[2] === 0;
          
          if (hasSkippedSub && hasSkippedSubSub) {
            // Direct child of Main (1.0.0.1)
            row.mainTitle = parentItem.title;
            row.subTitle = '';
            row.subSubTitle = '';
          } else if (hasSkippedSubSub) {
            // Direct child of Sub (1.1.0.1)
            row.subTitle = parentItem.title;
            const grandParent = findParentItem(items, parentItem);
            if (grandParent) {
              row.mainTitle = grandParent.title;
            }
            row.subSubTitle = '';
          } else {
            // Normal hierarchy
            row.subSubTitle = parentItem.title;
            const grandParent = findParentItem(items, parentItem);
            if (grandParent) {
              row.subTitle = grandParent.title;
              const greatGrandParent = findParentItem(items, grandParent);
              if (greatGrandParent) {
                row.mainTitle = greatGrandParent.title;
              }
            }
          }
        }
      }
    }
    
    rows.push(row);
    
    // Process children
    if (item.children.length > 0) {
      const childRows = structureToMatrix(item.children, item.hierarchicalNumber || rowNumber);
      rows.push(...childRows);
    }
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
      hierarchicalNumber: row.rowNumber, // Use rowNumber as hierarchicalNumber
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
  
  // Second pass: Build hierarchy
  rows.forEach(row => {
    const item = itemMap.get(row.id);
    if (!item) return;
    
    if (row.parentId && itemMap.has(row.parentId)) {
      const parentItem = itemMap.get(row.parentId)!;
      parentItem.children.push(item);
    } else if (row.depth === 0) {
      rootItems.push(item);
    } else {
      // Try to find parent by row number
      const parentNumber = row.rowNumber.split('.').slice(0, -1).join('.');
      const parentRow = rows.find(r => r.rowNumber === parentNumber);
      
      if (parentRow && itemMap.has(parentRow.id)) {
        const parentItem = itemMap.get(parentRow.id)!;
        parentItem.children.push(item);
      } else {
        // Orphaned item, add to root
        rootItems.push(item);
      }
    }
  });
  
  return rootItems;
}

/**
 * Flattens hierarchical structure for matrix display
 */
export function flattenStructure(items: StructureItem[], parentNumber: string = ''): StructureItem[] {
  const flattened: StructureItem[] = [];
  
  items.forEach((item, index) => {
    const itemNumber = item.hierarchicalNumber || (parentNumber ? `${parentNumber}.${index + 1}` : String(index + 1));
    
    flattened.push({
      ...item,
      number: itemNumber,
      hierarchicalNumber: itemNumber
    });
    
    if (item.children.length > 0) {
      flattened.push(...flattenStructure(item.children, itemNumber));
    }
  });
  
  return flattened;
}

/**
 * Updates a specific row in the matrix
 */
export function updateMatrixRow(rows: MatrixRow[], rowId: string, updates: Partial<MatrixRow>): MatrixRow[] {
  return rows.map(row => {
    if (row.id === rowId) {
      return { ...row, ...updates };
    }
    return row;
  });
}

/**
 * Adds a new row to the matrix
 */
export function addMatrixRow(rows: MatrixRow[], afterRowId: string | null, level: 1 | 2 | 3 | 4): MatrixRow[] {
  let parentId: string | null = null;
  let insertIndex = rows.length;
  
  if (afterRowId) {
    const afterRowIndex = rows.findIndex(r => r.id === afterRowId);
    const afterRow = rows[afterRowIndex];
    
    if (afterRow && afterRowIndex !== -1) {
      insertIndex = afterRowIndex + 1;
      
      // Determine parent based on level relationship
      if (level === 1) {
        // Main Title - no parent, insert after all descendants of afterRow
        parentId = null;
      } else if (level === afterRow.level + 1) {
        // Direct child of clicked row
        parentId = afterRow.id;
      } else if (level > afterRow.level + 1) {
        // Skipping levels - the clicked row is still the parent
        parentId = afterRow.id;
      } else {
        // Adding at same or higher level - find appropriate parent
        parentId = afterRow.parentId;
      }
      
      // Find the last descendant of the afterRow to insert after
      let lastDescendantIndex = afterRowIndex;
      for (let i = afterRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        // Check if this row is a descendant of afterRow
        if (afterRow.level < 4 && isDescendantOf(row, afterRow.id, rows)) {
          lastDescendantIndex = i;
        } else if (row.level <= afterRow.level) {
          // Found a sibling or parent level, stop
          break;
        }
      }
      insertIndex = lastDescendantIndex + 1;
    }
  }
  
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  
  const newRow: MatrixRow = {
    id: `matrix-${timestamp}-${random}`,
    rowNumber: '', // Will be recalculated
    level,
    mainTitle: '',
    subTitle: '',
    subSubTitle: '',
    action: '',
    responsible: [],
    dueDate: '',
    status: level === 4 ? 'open' : '',
    urls: [],
    attachments: [],
    parentId,
    hasChildren: false,
    depth: 0,
    structureItemId: `item-${timestamp}-${random}-${Math.random().toString(36).substring(2, 9)}`
  };
  
  const newRows = [...rows];
  newRows.splice(insertIndex, 0, newRow);
  
  // Recalculate row numbers
  return recalculateRowNumbers(newRows);
}

/**
 * Helper function to check if a row is a descendant of another row
 */
function isDescendantOf(row: MatrixRow, ancestorId: string, rows: MatrixRow[]): boolean {
  if (row.parentId === ancestorId) return true;
  if (!row.parentId) return false;
  
  const parent = rows.find(r => r.id === row.parentId);
  if (!parent) return false;
  
  return isDescendantOf(parent, ancestorId, rows);
}

/**
 * Removes a row from the matrix
 */
export function removeMatrixRow(rows: MatrixRow[], rowId: string): MatrixRow[] {
  const filtered = rows.filter(row => row.id !== rowId);
  return recalculateRowNumbers(filtered);
}

/**
 * Recalculates row numbers based on hierarchy with gap handling
 */
function recalculateRowNumbers(rows: MatrixRow[]): MatrixRow[] {
  const numbered: MatrixRow[] = [];
  const counters: { [key: string]: { [level: number]: number } } = {};
  
  rows.forEach(row => {
    const parentKey = row.parentId || 'root';
    const level = row.level;
    
    if (!counters[parentKey]) {
      counters[parentKey] = {};
    }
    
    if (!counters[parentKey][level]) {
      counters[parentKey][level] = 0;
    }
    
    counters[parentKey][level]++;
    
    let rowNumber = '';
    if (row.parentId) {
      const parentRow = numbered.find(r => r.id === row.parentId);
      if (parentRow) {
        const parentLevel = parentRow.level;
        const levelDiff = level - parentLevel - 1;
        
        // Build number with gaps
        const parts = parentRow.rowNumber.split('.');
        
        // Add zeros for skipped levels
        for (let i = 0; i < levelDiff; i++) {
          parts.push('0');
        }
        
        // Add the actual position number
        parts.push(String(counters[parentKey][level]));
        
        rowNumber = parts.join('.');
      }
    } else {
      rowNumber = String(counters[parentKey][level]);
    }
    
    numbered.push({
      ...row,
      rowNumber,
      depth: rowNumber.split('.').length - 1
    });
  });
  
  return numbered;
}