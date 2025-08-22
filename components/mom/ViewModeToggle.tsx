'use client';

import React from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { ViewMode } from '@/types/mom';

export default function ViewModeToggle() {
  const { state, dispatch } = useMOM();
  const { viewMode } = state;

  const handleViewModeChange = (mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => handleViewModeChange('normal')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          viewMode === 'normal'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Normal View - Hierarchical structure"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Normal</span>
        </div>
      </button>
      <button
        onClick={() => handleViewModeChange('matrix')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          viewMode === 'matrix'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Matrix View - Table format"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Matrix</span>
        </div>
      </button>
    </div>
  );
}