import { FlatMatrixRow } from '@/lib/mom/matrix-flat-conversion';
import { StatusCount } from './count-actions';

/**
 * Count actions from matrix rows to verify consistency with hierarchical count
 * @param rows Array of flat matrix rows
 * @returns Object with total and open action counts
 */
export function countActionsFromMatrix(rows: FlatMatrixRow[]): StatusCount {
  let total = 0;
  let open = 0;
  
  rows.forEach(row => {
    // Count only rows that have action content
    if (row.action && row.action.trim() !== '') {
      total++;
      // Count as open if status is 'open' or not set
      if (row.status === 'open' || !row.status) {
        open++;
      }
    }
  });
  
  return { total, open };
}

/**
 * Verify count consistency between hierarchical and matrix representations
 * @param hierarchyCount Count from hierarchical structure
 * @param matrixCount Count from matrix rows
 * @returns true if counts match
 */
export function verifyCountConsistency(
  hierarchyCount: StatusCount,
  matrixCount: StatusCount
): boolean {
  if (hierarchyCount.total !== matrixCount.total) {
    console.warn('Total count mismatch:', {
      hierarchy: hierarchyCount.total,
      matrix: matrixCount.total
    });
    return false;
  }
  
  if (hierarchyCount.open !== matrixCount.open) {
    console.warn('Open count mismatch:', {
      hierarchy: hierarchyCount.open,
      matrix: matrixCount.open
    });
    return false;
  }
  
  return true;
}