'use client';

import React, { useState } from 'react';
import { StatusCount, getActionBreakdown } from '@/lib/mom/count-actions';
import { StructureItem } from '@/types/mom';

interface StatusCountBadgeProps {
  count: StatusCount;
  items?: StructureItem[];
  showTooltip?: boolean;
}

export default function StatusCountBadge({ count, items, showTooltip = true }: StatusCountBadgeProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  
  const openPercentage = count.total > 0 
    ? Math.round((count.open / count.total) * 100) 
    : 0;
    
  const breakdown = items && showTooltip ? getActionBreakdown(items) : null;
  
  return (
    <div 
      className="ml-4 inline-flex items-center gap-2 relative"
      onMouseEnter={() => showTooltip && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      {/* Total count */}
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Total: {count.total}
      </span>
      
      {/* Open count with color coding */}
      {count.open > 0 && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          openPercentage > 70 ? 'bg-red-100 text-red-800' : 
          openPercentage > 30 ? 'bg-yellow-100 text-yellow-800' : 
          'bg-green-100 text-green-800'
        }`}>
          Open: {count.open}
        </span>
      )}
      
      {/* Simple text display for zero open items */}
      {count.total > 0 && count.open === 0 && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          All Closed
        </span>
      )}
      
      {/* Tooltip with breakdown */}
      {tooltipVisible && breakdown && (
        <div className="absolute z-10 top-full mt-2 left-0 p-3 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px]">
          <div className="text-sm">
            <p className="font-semibold mb-2">Actions by Level:</p>
            <div className="space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>• Direct under Main:</span>
                <span className="font-medium">
                  {breakdown.directUnderMain}
                  {breakdown.openByLevel.directUnderMain > 0 && (
                    <span className="text-red-600 ml-1">
                      ({breakdown.openByLevel.directUnderMain} open)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>• Under Sub:</span>
                <span className="font-medium">
                  {breakdown.underSub}
                  {breakdown.openByLevel.underSub > 0 && (
                    <span className="text-red-600 ml-1">
                      ({breakdown.openByLevel.underSub} open)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>• Under Sub Sub:</span>
                <span className="font-medium">
                  {breakdown.underSubSub}
                  {breakdown.openByLevel.underSubSub > 0 && (
                    <span className="text-red-600 ml-1">
                      ({breakdown.openByLevel.underSubSub} open)
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            {count.total > 0 && (
              <>
                <hr className="my-2" />
                <div className="flex justify-between text-xs">
                  <span>Completion:</span>
                  <span className="font-medium">{100 - openPercentage}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified version without tooltip for mobile or compact views
export function CompactStatusCountBadge({ count }: { count: StatusCount }) {
  return (
    <span className="ml-3 inline-flex items-center text-sm">
      <span className="font-normal text-gray-600">
        Total: {count.total}
      </span>
      {count.open > 0 && (
        <span className="ml-2 font-semibold text-red-600">
          (Open: {count.open})
        </span>
      )}
    </span>
  );
}