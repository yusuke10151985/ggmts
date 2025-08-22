'use client';

import React, { useState, useEffect } from 'react';
import { translationQueue } from '@/services/translationQueue';

export default function TranslationStatus() {
  const [status, setStatus] = useState<{
    pending: number;
    failed: number;
    lastError?: string;
  }>({ pending: 0, failed: 0 });
  
  useEffect(() => {
    // Monitor translation queue
    const interval = setInterval(() => {
      setStatus({
        pending: translationQueue.getPendingCount(),
        failed: translationQueue.getFailedCount(),
        lastError: translationQueue.getLastError() || undefined
      });
    }, 500); // Update every 500ms for smoother animation
    
    return () => clearInterval(interval);
  }, []);
  
  // Don't show if no activity
  if (status.pending === 0 && status.failed === 0) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-sm z-50 border border-gray-200">
      {/* Pending translations */}
      {status.pending > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <div className="relative">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <div className="absolute inset-0 animate-ping h-4 w-4 border-2 border-blue-500 rounded-full opacity-20" />
          </div>
          <span className="text-gray-700">
            Translating... ({status.pending} {status.pending === 1 ? 'item' : 'items'})
          </span>
        </div>
      )}
      
      {/* Failed translations */}
      {status.failed > 0 && (
        <div className="mt-2">
          <div className="text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {status.failed} translation{status.failed === 1 ? '' : 's'} failed
            </span>
          </div>
          {status.lastError && (
            <div className="text-xs text-gray-500 mt-1 ml-6">
              {status.lastError}
            </div>
          )}
        </div>
      )}
      
      {/* Clear button for failed translations */}
      {status.failed > 0 && (
        <button
          onClick={() => {
            translationQueue.clearStats();
            setStatus({ pending: 0, failed: 0 });
          }}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
        >
          Clear errors
        </button>
      )}
    </div>
  );
}