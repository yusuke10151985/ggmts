/**
 * Utility functions for maintaining hierarchical numbering in MOM structure
 * with gap handling for skipped levels (represented as 0)
 */

import { StructureItem } from '@/types/mom';

/**
 * Generates hierarchical number with gap handling
 * @param parentNumber Parent's hierarchical number
 * @param parentLevel Parent's level (1-4)
 * @param targetLevel Target item's level (1-4)
 * @param positionIndex Position among siblings (0-based)
 * @returns Hierarchical number with gaps represented as 0
 */
function generateHierarchicalNumberWithGaps(
  parentNumber: string,
  parentLevel: number,
  targetLevel: number,
  positionIndex: number
): string {
  // Parse parent number to array
  const parentParts = parentNumber ? parentNumber.split('.').map(Number) : [];
  
  // Calculate how many levels we're skipping
  const levelDifference = targetLevel - parentLevel - 1;
  
  // Build the new number
  const newParts = [...parentParts];
  
  // Add zeros for skipped levels
  for (let i = 0; i < levelDifference; i++) {
    newParts.push(0);
  }
  
  // Add the actual position number (1-based)
  newParts.push(positionIndex + 1);
  
  return newParts.join('.');
}

/**
 * Groups children by their actual level
 */
function groupChildrenByLevel(children: StructureItem[]): Map<number, StructureItem[]> {
  const groups = new Map<number, StructureItem[]>();
  
  children.forEach(child => {
    const level = child.level;
    if (!groups.has(level)) {
      groups.set(level, []);
    }
    groups.get(level)!.push(child);
  });
  
  return groups;
}

/**
 * Renumbers all items in the structure with hierarchical numbering
 * @param items Array of structure items to renumber
 * @param parentNumber Parent's hierarchical number (empty for root items)
 * @param parentLevel Parent's level (0 for root)
 * @returns Updated structure with correct hierarchical numbers
 */
export function renumberStructure(
  items: StructureItem[], 
  parentNumber: string = '',
  parentLevel: number = 0
): StructureItem[] {
  // Group items by level
  const levelGroups = groupChildrenByLevel(items);
  const result: StructureItem[] = [];
  
  // Process each level group
  levelGroups.forEach((levelItems, level) => {
    levelItems.forEach((item, index) => {
      // Generate hierarchical number with gaps
      const hierarchicalNumber = parentLevel === 0
        ? String(index + 1)  // Root level
        : generateHierarchicalNumberWithGaps(parentNumber, parentLevel, level, index);
      
      // Recursively renumber children
      const updatedChildren = renumberStructure(item.children, hierarchicalNumber, level);
      
      result.push({
        ...item,
        hierarchicalNumber,
        number: hierarchicalNumber, // Keep number field updated for backward compatibility
        children: updatedChildren
      });
    });
  });
  
  // Sort by hierarchical number to maintain display order
  return result.sort((a, b) => {
    const aParts = a.hierarchicalNumber.split('.').map(Number);
    const bParts = b.hierarchicalNumber.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart !== bPart) return aPart - bPart;
    }
    return 0;
  });
}

/**
 * Renumbers structure after an item is added
 * @param structure Current structure
 * @param parentId Parent item ID (null for root level)
 * @param newItem Item to be added
 * @returns Updated structure with new item and correct numbering
 */
export function addAndRenumber(
  structure: StructureItem[],
  parentId: string | null,
  newItem: StructureItem
): StructureItem[] {
  if (!parentId) {
    // Add to root level
    const updatedStructure = [...structure, newItem];
    return renumberStructure(updatedStructure);
  }
  
  // Add to specific parent
  const updatedStructure = addToParent(structure, parentId, newItem);
  return renumberStructure(updatedStructure);
}

/**
 * Helper function to add item to a specific parent
 * Now supports adding items at any level, potentially skipping intermediate levels
 */
function addToParent(
  items: StructureItem[],
  parentId: string,
  newItem: StructureItem
): StructureItem[] {
  return items.map(item => {
    if (item.id === parentId) {
      // Add to children, maintaining level order
      const updatedChildren = [...item.children, newItem];
      // Sort children by level and then by existing order
      updatedChildren.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        // Maintain relative order within same level
        return 0;
      });
      
      return {
        ...item,
        children: updatedChildren
      };
    }
    
    if (item.children.length > 0) {
      return {
        ...item,
        children: addToParent(item.children, parentId, newItem)
      };
    }
    
    return item;
  });
}

/**
 * Renumbers structure after an item is removed
 * @param structure Current structure
 * @param itemId ID of item to remove
 * @returns Updated structure without the item and with correct numbering
 */
export function removeAndRenumber(
  structure: StructureItem[],
  itemId: string
): StructureItem[] {
  const filtered = removeItem(structure, itemId);
  return renumberStructure(filtered);
}

/**
 * Helper function to remove item from structure
 */
function removeItem(items: StructureItem[], itemId: string): StructureItem[] {
  return items
    .filter(item => item.id !== itemId)
    .map(item => ({
      ...item,
      children: removeItem(item.children, itemId)
    }));
}

/**
 * Updates an item and maintains numbering
 * @param structure Current structure
 * @param itemId ID of item to update
 * @param updates Updates to apply
 * @returns Updated structure with correct numbering
 */
export function updateAndRenumber(
  structure: StructureItem[],
  itemId: string,
  updates: Partial<StructureItem>
): StructureItem[] {
  const updated = updateItem(structure, itemId, updates);
  // Only renumber if children were modified
  if ('children' in updates) {
    return renumberStructure(updated);
  }
  return updated;
}

/**
 * Helper function to update item in structure
 */
function updateItem(
  items: StructureItem[],
  itemId: string,
  updates: Partial<StructureItem>
): StructureItem[] {
  return items.map(item => {
    if (item.id === itemId) {
      return { ...item, ...updates };
    }
    
    if (item.children.length > 0) {
      return {
        ...item,
        children: updateItem(item.children, itemId, updates)
      };
    }
    
    return item;
  });
}

/**
 * Ensures all items have hierarchical numbers (for migration)
 * @param structure Current structure
 * @returns Structure with hierarchical numbers added if missing
 */
export function ensureHierarchicalNumbers(structure: StructureItem[]): StructureItem[] {
  return renumberStructure(structure);
}