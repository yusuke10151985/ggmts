'use client';

import React, { useState } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { compareMOMs, getRevisionColor } from '@/lib/mom/revision-utils';
import TextDifference from '@/components/mom/TextDifference';
import { StructureItem } from '@/types/mom';

// **HELPER FUNCTION**: Find structure item by ID
function findItemById(items: StructureItem[], id: string): StructureItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItemById(item.children || [], id);
    if (found) return found;
  }
  return null;
}

export default function RevisionDifferences() {
  const { state } = useMOM();
  const { currentMOM } = state;
  const [showDetails, setShowDetails] = useState(true); // **ALWAYS SHOW DETAILS**: Default to showing all differences

  // **CRITICAL REQUIREMENT 2**: Display differences when revision > 0
  if (!currentMOM || currentMOM.revision === 0 || !currentMOM.previousRevisionData) {
    return null;
  }

  const differences = compareMOMs(currentMOM, currentMOM.previousRevisionData);
  const hasChanges = 
    differences.titleChanged ||
    differences.goalChanged ||
    differences.dateChanged ||
    differences.companiesChanged ||
    differences.attendeesChanged ||
    differences.structureChanges.size > 0 ||
    differences.mainTimeSlotChanged ||
    differences.otherTimeSlotsChanged;

  if (!hasChanges) {
    return null;
  }

  const colorClass = getRevisionColor(currentMOM.revision);

  return (
    <div className={`mb-4 p-4 rounded-lg border-2 ${colorClass}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">
          Changes in {`Rev.${currentMOM.revision}`} 
          <span className="text-sm font-normal ml-2">
            (compared to Rev.{currentMOM.revision - 1})
          </span>
        </h3>
        {/* **TEXT DIFFERENCE TOGGLE**: Button to show/hide detailed differences */}
        <button
          className="text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      <ul className="space-y-1 text-sm">
        {differences.titleChanged && (
          <li>
            <div className="flex items-center gap-2">
              <span className="text-lg">•</span>
              <span className="font-bold">Meeting Title</span> changed
            </div>
            {/* **TEXT DIFFERENCE HIGHLIGHTING**: Show highlighted differences when expanded */}
            {showDetails && (
              <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-sm">
                <div className="text-gray-600 mb-1"><span className="font-bold">Previous:</span> {currentMOM.previousRevisionData.title}</div>
                <div className="text-gray-800">
                  <span className="font-bold">Current:</span> <TextDifference 
                    oldText={currentMOM.previousRevisionData.title}
                    newText={currentMOM.title}
                    revision={currentMOM.revision}
                  />
                </div>
              </div>
            )}
          </li>
        )}
        
        {differences.goalChanged && (
          <li>
            <div className="flex items-center gap-2">
              <span className="text-lg">•</span>
              <span className="font-bold">Meeting Goal</span> changed
            </div>
            {/* **TEXT DIFFERENCE HIGHLIGHTING**: Show highlighted differences when expanded */}
            {showDetails && (
              <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-sm">
                <div className="text-gray-600 mb-1"><span className="font-bold">Previous:</span> {currentMOM.previousRevisionData.goal || '(Not set)'}</div>
                <div className="text-gray-800">
                  <span className="font-bold">Current:</span> <TextDifference 
                    oldText={currentMOM.previousRevisionData.goal || ''}
                    newText={currentMOM.goal || ''}
                    revision={currentMOM.revision}
                  />
                </div>
              </div>
            )}
          </li>
        )}
        
        {differences.dateChanged && (
          <li>
            <div className="flex items-center gap-2">
              <span className="text-lg">•</span>
              <span className="font-bold">Meeting Date</span> changed
            </div>
            {/* **TEXT DIFFERENCE HIGHLIGHTING**: Show date change details */}
            {showDetails && (
              <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-sm">
                <div className="text-gray-600 mb-1"><span className="font-bold">Previous:</span> {currentMOM.previousRevisionData.date}</div>
                <div className="text-gray-800">
                  <span className="font-bold">Current:</span> <span className={`${getRevisionColor(currentMOM.revision).split(' ')[0]} font-bold`}>
                    {currentMOM.date}
                  </span>
                </div>
              </div>
            )}
          </li>
        )}
        
        {differences.companiesChanged && (
          <li>
            <div className="flex items-center gap-2">
              <span className="text-lg">•</span>
              <span className="font-bold">Companies</span> modified
            </div>
            {/* **COMPANY CHANGES**: Show detailed changes with color highlighting */}
            {showDetails && (
              <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-sm">
                <div className="text-gray-600 mb-1"><span className="font-bold">Previous:</span> {currentMOM.previousRevisionData.companies.map(c => c.name).join(', ')}</div>
                <div className="text-gray-800">
                  <span className="font-bold">Current:</span> <span className={`${getRevisionColor(currentMOM.revision).split(' ')[0]} font-bold`}>
                    {currentMOM.companies.map(c => c.name).join(', ')}
                  </span>
                </div>
              </div>
            )}
          </li>
        )}
        
        {differences.attendeesChanged && (
          <li>
            <div className="flex items-center gap-2">
              <span className="text-lg">•</span>
              <span className="font-bold">Attendees</span> modified
            </div>
            {/* **ATTENDEE CHANGES**: Show detailed changes with color highlighting */}
            {showDetails && (
              <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-sm">
                <div className="text-gray-600 mb-1"><span className="font-bold">Previous:</span> {currentMOM.previousRevisionData.attendees.map(a => a.name).join(', ')}</div>
                <div className="text-gray-800">
                  <span className="font-bold">Current:</span> <span className={`${getRevisionColor(currentMOM.revision).split(' ')[0]} font-bold`}>
                    {currentMOM.attendees.map(a => a.name).join(', ')}
                  </span>
                </div>
              </div>
            )}
          </li>
        )}
        
        {differences.mainTimeSlotChanged && (
          <li>
            <div className="flex items-center gap-2">
              <span className="text-lg">•</span>
              <span className="font-bold">Main Time Slot</span> changed
            </div>
            {/* **TIME SLOT CHANGES**: Show detailed changes with color highlighting */}
            {showDetails && currentMOM.mainTimeSlot && currentMOM.previousRevisionData.mainTimeSlot && (
              <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-sm">
                <div className="text-gray-600 mb-1">
                  Previous: {currentMOM.previousRevisionData.mainTimeSlot.country} | {currentMOM.previousRevisionData.mainTimeSlot.startTime} - {currentMOM.previousRevisionData.mainTimeSlot.endTime}
                </div>
                <div className="text-gray-800">
                  Current: <span className={`${getRevisionColor(currentMOM.revision).split(' ')[0]} font-bold`}>
                    {currentMOM.mainTimeSlot.country} | {currentMOM.mainTimeSlot.startTime} - {currentMOM.mainTimeSlot.endTime}
                  </span>
                </div>
              </div>
            )}
          </li>
        )}
        
        {differences.otherTimeSlotsChanged && (
          <li className="flex items-center gap-2">
            <span className="text-lg">•</span>
            <span className="font-bold">Other Country Times</span> changed
          </li>
        )}
        
        {differences.structureChanges.size > 0 && (
          <li>
            <div className="flex items-center gap-2">
              <span className="text-lg">•</span>
              <span className="font-bold">{differences.structureChanges.size} Agenda Items</span> modified
            </div>
            {/* **STRUCTURE CHANGES**: Show detailed changes with color highlighting */}
            {showDetails && (
              <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-sm space-y-2">
                {Array.from(differences.structureChanges).map(([itemId, changeType]) => {
                  const newItem = findItemById(currentMOM.structure, itemId);
                  const oldItem = currentMOM.previousRevisionData ? findItemById(currentMOM.previousRevisionData.structure, itemId) : null;
                  
                  return (
                    <div key={itemId} className="border-l-2 border-gray-300 pl-2">
                      <div className="font-medium">
                        {newItem?.number || oldItem?.number} {newItem?.title || oldItem?.title}
                      </div>
                      {changeType === 'added' && (
                        <span className={`text-sm ${getRevisionColor(currentMOM.revision).split(' ')[0]} font-bold`}>
                          ✓ Added
                        </span>
                      )}
                      {changeType === 'removed' && (
                        <span className="text-sm text-red-600 font-bold line-through">
                          ✗ Removed
                        </span>
                      )}
                      {changeType === 'modified' && oldItem && newItem && (
                        <div className="text-sm">
                          <TextDifference 
                            oldText={oldItem.title}
                            newText={newItem.title}
                            revision={currentMOM.revision}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}