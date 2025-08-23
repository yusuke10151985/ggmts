'use client';

import React, { useState } from 'react';

export default function CacheClearButton() {
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');

  const clearAllCaches = async () => {
    setClearing(true);
    setMessage('Clearing caches...');
    
    try {
      // Clear browser cache (reload without cache)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      setMessage('Cache cleared successfully! Reloading...');
      
      // Force reload without cache
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      setMessage('Error clearing cache. Please try manual refresh (Ctrl+Shift+R / Cmd+Shift+R)');
      setClearing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={clearAllCaches}
        disabled={clearing}
        className="btn-secondary flex items-center gap-2"
        title="Clear all caches and reload"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {clearing ? 'Clearing...' : 'Clear Cache'}
      </button>
      {message && (
        <span className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </span>
      )}
    </div>
  );
}