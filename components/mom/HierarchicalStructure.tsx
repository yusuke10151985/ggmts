'use client';

import React, { useMemo } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import StructureItem from '@/components/mom/StructureItem';
import { StructureItem as IStructureItem } from '@/types/mom';
import RevisionLegend from '@/components/mom/RevisionLegend';
import ViewModeToggle from '@/components/mom/ViewModeToggle';
import StatusCountBadge from '@/components/mom/StatusCountBadge';
import { countActionsInHierarchy } from '@/lib/mom/count-actions';

export default function HierarchicalStructure() {
  const { state, dispatch } = useMOM();
  const { currentMOM } = state;
  
  // Calculate action counts (must be before any conditional returns)
  const statusCount = useMemo(() => {
    return countActionsInHierarchy(currentMOM?.structure || []);
  }, [currentMOM?.structure]);

  if (!currentMOM) return null;

  const addMainTitle = () => {
    const newItem: IStructureItem = {
      id: `item-${Date.now()}`,
      level: 1,
      number: String(currentMOM.structure.length + 1),
      hierarchicalNumber: '', // Will be calculated by reducer
      title: '',
      children: [],
      originalRevision: currentMOM.revision,
      lastModifiedRevision: currentMOM.revision,
    };
    
    dispatch({ type: 'ADD_STRUCTURE_ITEM', parentId: null, item: newItem });
  };

  // Move structure item up
  const moveStructureUp = (index: number) => {
    if (index <= 0) return;
    
    const newStructure = [...currentMOM.structure];
    [newStructure[index - 1], newStructure[index]] = [newStructure[index], newStructure[index - 1]];
    
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'structure', value: newStructure });
  };

  // Move structure item down
  const moveStructureDown = (index: number) => {
    if (index >= currentMOM.structure.length - 1) return;
    
    const newStructure = [...currentMOM.structure];
    [newStructure[index], newStructure[index + 1]] = [newStructure[index + 1], newStructure[index]];
    
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'structure', value: newStructure });
  };

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center flex-wrap agenda-header-wrapper">
          <h2 className="mb-0">
            Agenda Structure
          </h2>
          <StatusCountBadge 
            count={statusCount} 
            items={currentMOM.structure}
            showTooltip={true}
          />
        </div>
        <ViewModeToggle />
      </div>
      
      {/* Show revision legend if revision > 0 */}
      {currentMOM.revision > 0 && (
        <RevisionLegend 
          currentRevision={currentMOM.revision} 
          baseRevision={currentMOM.baseRevision}
        />
      )}
      
      <div className="mb-4">
        <button className="btn btn-primary" onClick={addMainTitle}>
          Add Main Title
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-lg min-h-[200px]">
        {currentMOM.structure.length === 0 ? (
          <div className="text-center text-gray-500 italic py-12">
            No agenda items yet. Click &quot;Add Main Title&quot; to start.
          </div>
        ) : (
          <div className="space-y-4">
            {currentMOM.structure.map((item, index) => (
              <StructureItem
                key={item.id}
                item={item}
                parentNumber=""
                index={index}
                currentRevision={currentMOM.revision}
                isFirst={index === 0}
                isLast={index === currentMOM.structure.length - 1}
                onMoveUp={() => moveStructureUp(index)}
                onMoveDown={() => moveStructureDown(index)}
              />
            ))}
            
            {/* **ADD MAIN TITLE BUTTON AT BOTTOM**: Duplicate button for convenience */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button className="btn btn-primary" onClick={addMainTitle}>
                Add Main Title
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}