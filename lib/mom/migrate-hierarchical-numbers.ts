/**
 * Migration utility to ensure existing MOMs have proper hierarchical numbering
 * This ensures gap-based numbering (1.0.1 format) is correctly applied
 */

import { MOM } from '@/types/mom';
import { renumberStructure } from './renumber-structure';
import { getMOMList, loadMOM, saveMOM } from '@/services/api';

/**
 * Migrates a single MOM to use correct hierarchical numbering
 * @param mom The MOM to migrate
 * @returns The migrated MOM
 */
export function migrateMOMNumbering(mom: MOM): MOM {
  // Check if migration is needed - look for missing hierarchicalNumber or incorrect numbering
  let needsMigration = false;
  
  // Check if any item is missing hierarchicalNumber
  const checkStructure = (items: any[]): boolean => {
    for (const item of items) {
      if (!item.hierarchicalNumber) {
        return true;
      }
      if (item.children && item.children.length > 0) {
        if (checkStructure(item.children)) {
          return true;
        }
      }
    }
    return false;
  };
  
  needsMigration = checkStructure(mom.structure);
  
  if (!needsMigration) {
    // Already has hierarchical numbers
    return mom;
  }
  
  // Apply hierarchical numbering with gap handling
  const updatedStructure = renumberStructure(mom.structure);
  
  return {
    ...mom,
    structure: updatedStructure,
    // Add a flag to indicate this MOM has been migrated
    migrationVersion: '1.5.0'
  } as MOM;
}

/**
 * Migrates all MOMs in the system to use correct hierarchical numbering
 * @returns Promise with migration results
 */
export async function migrateAllMOMs(): Promise<{
  total: number;
  migrated: number;
  errors: string[];
}> {
  const results = {
    total: 0,
    migrated: 0,
    errors: [] as string[]
  };
  
  try {
    // Fetch all MOMs
    const momsResponse = await getMOMList();
    if (!momsResponse.success || !momsResponse.data) {
      throw new Error('Failed to fetch MOMs');
    }
    
    const momList = momsResponse.data;
    results.total = momList.length;
    
    console.log(`Starting migration for ${results.total} MOMs...`);
    
    // Process each MOM
    for (const momItem of momList) {
      try {
        // Load full MOM data
        const momResponse = await loadMOM(momItem.momId, momItem.revision);
        if (!momResponse.success || !momResponse.data) {
          throw new Error(`Failed to load MOM ${momItem.momId}`);
        }
        
        const mom = momResponse.data;
        
        // Check if migration is needed
        const needsMigration = JSON.stringify(mom.structure).includes('.0.');
        
        if (!needsMigration) {
          console.log(`MOM ${mom.momId} (Rev ${mom.revision}) - No migration needed`);
          continue;
        }
        
        console.log(`Migrating MOM ${mom.momId} (Rev ${mom.revision})...`);
        
        // Migrate the MOM
        const migratedMOM = migrateMOMNumbering(mom);
        
        // Save the migrated MOM (as draft to preserve status)
        const updateResponse = await saveMOM(migratedMOM, mom.status === 'Draft');
        
        if (updateResponse.success) {
          results.migrated++;
          console.log(`✓ Successfully migrated MOM ${mom.momId} (Rev ${mom.revision})`);
        } else {
          const error = `Failed to save migrated MOM ${mom.momId}: ${updateResponse.error}`;
          results.errors.push(error);
          console.error(`✗ ${error}`);
        }
      } catch (error) {
        const errorMsg = `Error migrating MOM ${momItem.momId}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total MOMs: ${results.total}`);
    console.log(`Migrated: ${results.migrated}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`- ${error}`));
    }
    
  } catch (error) {
    const errorMsg = `Fatal error during migration: ${error instanceof Error ? error.message : String(error)}`;
    results.errors.push(errorMsg);
    console.error(errorMsg);
  }
  
  return results;
}

/**
 * Checks if a MOM needs migration
 * @param mom The MOM to check
 * @returns true if migration is needed
 */
export function needsHierarchicalNumberMigration(mom: MOM): boolean {
  // Check if any item is missing hierarchicalNumber
  const checkStructure = (items: any[]): boolean => {
    for (const item of items) {
      if (!item.hierarchicalNumber) {
        return true;
      }
      if (item.children && item.children.length > 0) {
        if (checkStructure(item.children)) {
          return true;
        }
      }
    }
    return false;
  };
  
  return checkStructure(mom.structure);
}

/**
 * Dry run to check which MOMs would be migrated
 * @returns Promise with list of MOMs that need migration
 */
export async function checkMigrationNeeded(): Promise<{
  needsMigration: Array<{ momId: string; revision: number; title: string }>;
  alreadyMigrated: number;
  total: number;
}> {
  const result = {
    needsMigration: [] as Array<{ momId: string; revision: number; title: string }>,
    alreadyMigrated: 0,
    total: 0
  };
  
  try {
    const momsResponse = await getMOMList();
    if (!momsResponse.success || !momsResponse.data) {
      throw new Error('Failed to fetch MOMs');
    }
    
    const momList = momsResponse.data;
    result.total = momList.length;
    
    for (const momItem of momList) {
      // Load full MOM to check structure
      const momResponse = await loadMOM(momItem.momId, momItem.revision);
      if (!momResponse.success || !momResponse.data) {
        console.error(`Failed to load MOM ${momItem.momId}`);
        continue;
      }
      
      const mom = momResponse.data;
      if (needsHierarchicalNumberMigration(mom)) {
        result.needsMigration.push({
          momId: mom.momId,
          revision: mom.revision,
          title: mom.title
        });
      } else {
        result.alreadyMigrated++;
      }
    }
    
  } catch (error) {
    console.error('Error checking migration needs:', error);
  }
  
  return result;
}