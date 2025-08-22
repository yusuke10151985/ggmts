// Utility functions for revision tracking and comparison

import { StructureItem, MOM } from '@/types/mom';

/**
 * Get the color class for a specific revision
 * @param revision - The revision number
 * @returns Tailwind CSS classes for the revision color
 */
export function getRevisionColor(revision: number): string {
  const colors = [
    'text-gray-600 bg-gray-50',      // Rev.0
    'text-blue-600 bg-blue-50',      // Rev.1
    'text-green-600 bg-green-50',    // Rev.2
    'text-purple-600 bg-purple-50',  // Rev.3
    'text-orange-600 bg-orange-50',  // Rev.4
    'text-pink-600 bg-pink-50',      // Rev.5
    'text-indigo-600 bg-indigo-50',  // Rev.6
    'text-red-600 bg-red-50',        // Rev.7
  ];
  
  return colors[revision % colors.length];
}

/**
 * Get the hex color for a specific revision (for PDF/MD export)
 * @param revision - The revision number
 * @returns Hex color code
 */
export function getRevisionHexColor(revision: number): string {
  const colors = [
    '#4B5563', // Rev.0 - gray
    '#2563EB', // Rev.1 - blue
    '#059669', // Rev.2 - green
    '#7C3AED', // Rev.3 - purple
    '#EA580C', // Rev.4 - orange
    '#DB2777', // Rev.5 - pink
    '#4F46E5', // Rev.6 - indigo
    '#DC2626', // Rev.7 - red
  ];
  
  return colors[revision % colors.length];
}

/**
 * Check if a structure item has been modified in the current revision
 * @param item - The structure item to check
 * @param currentRevision - The current revision number
 * @returns true if the item was modified in this revision
 */
export function isModifiedInRevision(item: StructureItem, currentRevision: number): boolean {
  return item.lastModifiedRevision === currentRevision && 
         item.lastModifiedRevision !== item.originalRevision;
}

/**
 * Get revision display text
 * @param revision - The revision number
 * @returns Formatted revision text
 */
export function getRevisionDisplay(revision: number): string {
  return `Rev.${revision}`;
}

/**
 * **CRITICAL REQUIREMENT 2**: Compare two MOMs and find differences
 * @param currentMOM - The current MOM
 * @param previousMOM - The previous MOM to compare against
 * @returns Object containing the differences
 */
export function compareMOMs(currentMOM: MOM, previousMOM: MOM | undefined): {
  titleChanged: boolean;
  goalChanged: boolean;
  dateChanged: boolean;
  companiesChanged: boolean;
  attendeesChanged: boolean;
  structureChanges: Map<string, string>;
  mainTimeSlotChanged: boolean;
  otherTimeSlotsChanged: boolean;
} {
  if (!previousMOM) {
    return {
      titleChanged: false,
      goalChanged: false,
      dateChanged: false,
      companiesChanged: false,
      attendeesChanged: false,
      structureChanges: new Map(),
      mainTimeSlotChanged: false,
      otherTimeSlotsChanged: false,
    };
  }

  return {
    titleChanged: currentMOM.title !== previousMOM.title,
    goalChanged: (currentMOM.goal || '') !== (previousMOM.goal || ''),
    dateChanged: currentMOM.date !== previousMOM.date,
    companiesChanged: JSON.stringify(currentMOM.companies) !== JSON.stringify(previousMOM.companies),
    attendeesChanged: JSON.stringify(currentMOM.attendees) !== JSON.stringify(previousMOM.attendees),
    structureChanges: findStructureChanges(currentMOM.structure, previousMOM.structure),
    mainTimeSlotChanged: JSON.stringify(currentMOM.mainTimeSlot) !== JSON.stringify(previousMOM.mainTimeSlot),
    otherTimeSlotsChanged: JSON.stringify(currentMOM.otherTimeSlots) !== JSON.stringify(previousMOM.otherTimeSlots),
  };
}

/**
 * Find changes in structure items
 * @param current - Current structure items
 * @param previous - Previous structure items
 * @returns Map of changed item IDs to change type
 */
function findStructureChanges(current: StructureItem[], previous: StructureItem[]): Map<string, string> {
  const changes = new Map<string, string>();
  const previousMap = new Map<string, StructureItem>();
  
  // Build map of previous items
  const buildMap = (items: StructureItem[]) => {
    items.forEach(item => {
      previousMap.set(item.id, item);
      if (item.children) {
        buildMap(item.children);
      }
    });
  };
  buildMap(previous);
  
  // Check for removed items
  previousMap.forEach((prevItem, id) => {
    const currentItem = findItemById(current, id);
    if (!currentItem) {
      changes.set(id, 'removed');
    }
  });
  
  // Check current items for changes
  const checkChanges = (items: StructureItem[]) => {
    items.forEach(item => {
      const prevItem = previousMap.get(item.id);
      if (!prevItem) {
        changes.set(item.id, 'added');
      } else if (item.title !== prevItem.title) {
        changes.set(item.id, 'modified');
      }
      if (item.children) {
        checkChanges(item.children);
      }
    });
  };
  checkChanges(current);
  
  return changes;
}

// Helper to find item by ID in structure
function findItemById(items: StructureItem[], id: string): StructureItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children ? findItemById(item.children, id) : null;
    if (found) return found;
  }
  return null;
}