'use client';

import React from 'react';
import { getRevisionColor, getRevisionDisplay } from '@/lib/mom/revision-utils';

interface Props {
  currentRevision: number;
  baseRevision?: number;
}

export default function RevisionLegend({ currentRevision, baseRevision = 0 }: Props) {
  // Don't show legend for new MOMs or Rev.0
  if (currentRevision === 0) return null;

  const revisions = [];
  for (let i = baseRevision; i <= currentRevision; i++) {
    revisions.push(i);
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Revision History</h3>
      <div className="flex flex-wrap gap-2">
        {revisions.map((rev) => (
          <div
            key={rev}
            className={`px-3 py-1 rounded text-sm font-medium ${getRevisionColor(rev)}`}
          >
            {getRevisionDisplay(rev)}
            {rev === currentRevision && ' (Current)'}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Items are highlighted with the revision color when they were last modified.
      </p>
    </div>
  );
}