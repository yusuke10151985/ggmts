/**
 * Flat matrix conversion utilities for Matrix Mode
 * Each row represents a complete path from Main to Action (or partial path)
 */

import { StructureItem, MatrixRow, ResponsibleParty, Attachment } from '@/types/mom';

export interface FlatMatrixRow {
  id: string;
  hierarchicalNumber: string; // Keep internally but don't display
  
  // All editable in single row
  mainTitle: string;
  subTitle: string;
  subSubTitle: string;
  action: string;
  
  // Metadata
  responsible: ResponsibleParty[];
  dueDate: string;
  status: 'open' | 'closed' | '';
  
  // Attachments
  urls: string[];
  attachments: Attachment[];
  
  // Translations (for each filled level)
  mainTranslations?: any;
  subTranslations?: any;
  subSubTranslations?: any;
  actionTranslations?: any;
  
  // Internal tracking
  structureItemIds: {
    main?: string;
    sub?: string;
    subSub?: string;
    action?: string;
  };
}

/**
 * Converts hierarchical structure to flat matrix rows
 * Each row represents a complete or partial path through the hierarchy
 */
export function structureToFlatMatrix(items: StructureItem[]): FlatMatrixRow[] {
  const rows: FlatMatrixRow[] = [];
  
  function processMain(mainItem: StructureItem) {
    // Check if main has any descendants
    const hasChildren = mainItem.children.length > 0;
    
    if (!hasChildren) {
      // Standalone main title
      rows.push({
        id: `row-${Date.now()}-${Math.random()}`,
        hierarchicalNumber: mainItem.hierarchicalNumber || mainItem.number || '',
        mainTitle: mainItem.title,
        subTitle: '',
        subSubTitle: '',
        action: '',
        responsible: [],
        dueDate: '',
        status: '',
        urls: mainItem.urls || [],
        attachments: mainItem.attachments || [],
        mainTranslations: mainItem.translations,
        structureItemIds: { main: mainItem.id }
      });
      return;
    }
    
    // Process all children
    mainItem.children.forEach(child => {
      if (child.level === 2) {
        processSub(mainItem, child);
      } else if (child.level === 3) {
        processSubSub(mainItem, null, child);
      } else if (child.level === 4) {
        processAction(mainItem, null, null, child);
      }
    });
  }
  
  function processSub(mainItem: StructureItem, subItem: StructureItem) {
    const hasChildren = subItem.children.length > 0;
    
    if (!hasChildren) {
      // Main → Sub (no further children)
      rows.push({
        id: `row-${Date.now()}-${Math.random()}`,
        hierarchicalNumber: subItem.hierarchicalNumber || subItem.number || '',
        mainTitle: mainItem.title,
        subTitle: subItem.title,
        subSubTitle: '',
        action: '',
        responsible: [],
        dueDate: '',
        status: '',
        urls: subItem.urls || [],
        attachments: subItem.attachments || [],
        mainTranslations: mainItem.translations,
        subTranslations: subItem.translations,
        structureItemIds: { main: mainItem.id, sub: subItem.id }
      });
      return;
    }
    
    // Process sub's children
    subItem.children.forEach(child => {
      if (child.level === 3) {
        processSubSub(mainItem, subItem, child);
      } else if (child.level === 4) {
        processAction(mainItem, subItem, null, child);
      }
    });
  }
  
  function processSubSub(mainItem: StructureItem, subItem: StructureItem | null, subSubItem: StructureItem) {
    const hasChildren = subSubItem.children.length > 0;
    
    if (!hasChildren) {
      // Path ends at Sub Sub
      rows.push({
        id: `row-${Date.now()}-${Math.random()}`,
        hierarchicalNumber: subSubItem.hierarchicalNumber || subSubItem.number || '',
        mainTitle: mainItem.title,
        subTitle: subItem?.title || '',
        subSubTitle: subSubItem.title,
        action: '',
        responsible: [],
        dueDate: '',
        status: '',
        urls: subSubItem.urls || [],
        attachments: subSubItem.attachments || [],
        mainTranslations: mainItem.translations,
        subTranslations: subItem?.translations,
        subSubTranslations: subSubItem.translations,
        structureItemIds: { 
          main: mainItem.id, 
          sub: subItem?.id,
          subSub: subSubItem.id 
        }
      });
      return;
    }
    
    // Process Sub Sub's actions
    subSubItem.children.forEach(child => {
      if (child.level === 4) {
        processAction(mainItem, subItem, subSubItem, child);
      }
    });
  }
  
  function processAction(
    mainItem: StructureItem, 
    subItem: StructureItem | null, 
    subSubItem: StructureItem | null, 
    actionItem: StructureItem
  ) {
    rows.push({
      id: `row-${Date.now()}-${Math.random()}`,
      hierarchicalNumber: actionItem.hierarchicalNumber || actionItem.number || '',
      mainTitle: mainItem.title,
      subTitle: subItem?.title || '',
      subSubTitle: subSubItem?.title || '',
      action: actionItem.title,
      responsible: actionItem.responsibleParties || [],
      dueDate: actionItem.dueDate || '',
      status: actionItem.status || '',
      urls: actionItem.urls || [],
      attachments: actionItem.attachments || [],
      mainTranslations: mainItem.translations,
      subTranslations: subItem?.translations,
      subSubTranslations: subSubItem?.translations,
      actionTranslations: actionItem.translations,
      structureItemIds: { 
        main: mainItem.id,
        sub: subItem?.id,
        subSub: subSubItem?.id,
        action: actionItem.id 
      }
    });
  }
  
  // Process all main items
  items.forEach(mainItem => {
    if (mainItem.level === 1) {
      processMain(mainItem);
    }
  });
  
  return rows;
}

/**
 * Converts flat matrix rows back to hierarchical structure
 * IMPORTANT: This now handles duplicate titles by tracking items by their unique IDs
 */
export function flatMatrixToStructure(rows: FlatMatrixRow[]): StructureItem[] {
  // Use ID-based maps to avoid merging items with same titles
  const itemsById = new Map<string, StructureItem>();
  const rootItems: StructureItem[] = [];
  const processedRows = new Set<string>();
  
  // Helper to create or get item by ID
  function getOrCreateItem(
    itemId: string | undefined, 
    title: string, 
    level: 1 | 2 | 3 | 4,
    translations?: any,
    urls?: string[],
    attachments?: Attachment[]
  ): StructureItem {
    const id = itemId || `item-${Date.now()}-${Math.random()}-${Math.random()}`;
    
    if (!itemsById.has(id)) {
      const newItem: StructureItem = {
        id,
        level,
        number: '',
        hierarchicalNumber: '',
        title,
        children: [],
        translations,
        urls: urls || [],
        attachments: attachments || []
      };
      itemsById.set(id, newItem);
    }
    
    return itemsById.get(id)!;
  }
  
  // Process each row
  rows.forEach((row, rowIndex) => {
    const rowKey = `${rowIndex}-${row.id}`;
    if (processedRows.has(rowKey)) return;
    processedRows.add(rowKey);
    
    let mainItem: StructureItem | null = null;
    let subItem: StructureItem | null = null;
    let subSubItem: StructureItem | null = null;
    
    // Create Main item if exists
    if (row.mainTitle) {
      mainItem = getOrCreateItem(
        row.structureItemIds.main,
        row.mainTitle,
        1,
        row.mainTranslations,
        row.structureItemIds.main && !row.subTitle && !row.subSubTitle && !row.action ? row.urls : undefined,
        row.structureItemIds.main && !row.subTitle && !row.subSubTitle && !row.action ? row.attachments : undefined
      );
      
      // Add to root if not already there
      if (!rootItems.some(item => item.id === mainItem!.id)) {
        rootItems.push(mainItem);
      }
    }
    
    // Create Sub item if exists
    if (row.subTitle && mainItem) {
      subItem = getOrCreateItem(
        row.structureItemIds.sub,
        row.subTitle,
        2,
        row.subTranslations,
        row.structureItemIds.sub && !row.subSubTitle && !row.action ? row.urls : undefined,
        row.structureItemIds.sub && !row.subSubTitle && !row.action ? row.attachments : undefined
      );
      
      // Add to main's children if not already there
      if (!mainItem.children.some(child => child.id === subItem!.id)) {
        mainItem.children.push(subItem);
      }
    }
    
    // Create Sub Sub item if exists
    if (row.subSubTitle) {
      subSubItem = getOrCreateItem(
        row.structureItemIds.subSub,
        row.subSubTitle,
        3,
        row.subSubTranslations,
        row.structureItemIds.subSub && !row.action ? row.urls : undefined,
        row.structureItemIds.subSub && !row.action ? row.attachments : undefined
      );
      
      // Add to appropriate parent
      const parent = subItem || mainItem;
      if (parent && !parent.children.some(child => child.id === subSubItem!.id)) {
        parent.children.push(subSubItem);
      }
    }
    
    // Create Action item if exists
    if (row.action) {
      const actionItem: StructureItem = {
        id: row.structureItemIds.action || `item-${Date.now()}-${Math.random()}-${Math.random()}`,
        level: 4,
        number: '',
        hierarchicalNumber: '',
        title: row.action,
        children: [],
        actionId: `ACT-${Date.now()}-${Math.random()}`,
        responsibleParties: row.responsible,
        dueDate: row.dueDate,
        status: row.status as 'open' | 'closed' | undefined,
        translations: row.actionTranslations,
        urls: row.urls,
        attachments: row.attachments
      };
      
      // Add to appropriate parent
      const parent = subSubItem || subItem || mainItem;
      if (parent) {
        parent.children.push(actionItem);
      }
    }
  });
  
  return rootItems;
}