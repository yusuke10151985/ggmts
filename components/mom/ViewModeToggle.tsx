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
    <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600">
      <button
        onClick={() => handleViewModeChange('normal')}
        className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
          viewMode === 'normal'
            ? 'bg-blue-500 text-white shadow-md border-2 border-blue-600'
            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
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
        className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
          viewMode === 'matrix'
            ? 'bg-blue-500 text-white shadow-md border-2 border-blue-600'
            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
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