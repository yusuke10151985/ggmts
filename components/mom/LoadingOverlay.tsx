'use client';

import React from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';

export default function LoadingOverlay() {
  const { state } = useMOM();
  const { saving, uploading } = state;

  if (!saving && !uploading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <div className="flex flex-col items-center">
          {/* Loading spinner */}
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          
          {/* Loading text */}
          <p className="text-lg font-semibold text-gray-700">
            {saving ? 'Saving MOM...' : 'Uploading file...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please wait, do not close this window
          </p>
        </div>
      </div>
    </div>
  );
}