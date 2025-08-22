import { StructureItem } from '@/types/mom';

export interface StatusCount {
  total: number;
  open: number;
}

/**
 * Recursively count all actions (level 4 items) in the structure hierarchy
 * @param items Array of structure items to process
 * @returns Object with total and open action counts
 */
export function countActionsInHierarchy(items: StructureItem[]): StatusCount {
  let total = 0;
  let open = 0;
  
  const processItem = (item: StructureItem) => {
    // Check if this is an action (level 4)
    if (item.level === 4) {
      total++;
      // Count as open if status is explicitly 'open' or not set
      if (item.status === 'open' || !item.status) {
        open++;
      }
    }
    
    // Process children recursively
    if (item.children && Array.isArray(item.children)) {
      item.children.forEach(processItem);
    }
  };
  
  // Process all items
  items.forEach(processItem);
  
  return { total, open };
}

/**
 * Get detailed breakdown of actions by hierarchy level
 * Useful for tooltips or detailed reports
 */
export function getActionBreakdown(items: StructureItem[]) {
  const breakdown = {
    directUnderMain: 0,
    underSub: 0,
    underSubSub: 0,
    openByLevel: {
      directUnderMain: 0,
      underSub: 0,
      underSubSub: 0
    }
  };
  
  items.forEach(mainItem => {
    // Check direct actions under main
    mainItem.children.forEach(child => {
      if (child.level === 4) {
        breakdown.directUnderMain++;
        if (child.status === 'open' || !child.status) {
          breakdown.openByLevel.directUnderMain++;
        }
      } else if (child.level === 2) {
        // Check actions under sub
        child.children.forEach(subChild => {
          if (subChild.level === 4) {
            breakdown.underSub++;
            if (subChild.status === 'open' || !subChild.status) {
              breakdown.openByLevel.underSub++;
            }
          } else if (subChild.level === 3) {
            // Check actions under sub-sub
            subChild.children.forEach(subSubChild => {
              if (subSubChild.level === 4) {
                breakdown.underSubSub++;
                if (subSubChild.status === 'open' || !subSubChild.status) {
                  breakdown.openByLevel.underSubSub++;
                }
              }
            });
          }
        });
      } else if (child.level === 3) {
        // Direct sub-sub under main (skipped sub)
        child.children.forEach(subSubChild => {
          if (subSubChild.level === 4) {
            breakdown.underSubSub++;
            if (subSubChild.status === 'open' || !subSubChild.status) {
              breakdown.openByLevel.underSubSub++;
            }
          }
        });
      }
    });
  });
  
  return breakdown;
}