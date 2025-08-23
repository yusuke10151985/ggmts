'use client';

import React, { useEffect, useState } from 'react';

export default function DebugButton() {
  const [isWindows, setIsWindows] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Check if running on Windows
    const isWin = navigator.platform.indexOf('Win') !== -1 || 
                  navigator.userAgent.indexOf('Windows') !== -1;
    setIsWindows(isWin);

    // Update log counts
    const updateCounts = () => {
      if ((window as any).momLogger) {
        const logs = (window as any).momLogger.getLogs();
        setLogCount(logs.length);
        setErrorCount(logs.filter((l: any) => l.level === 'error').length);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 1000);

    return () => clearInterval(interval);
  }, []);

  const showDebugPanel = () => {
    if ((window as any).momLogger) {
      (window as any).momLogger.showDebugPanel();
    }
  };

  const sendLogs = async () => {
    if ((window as any).momLogger) {
      await (window as any).momLogger.sendLogsToServer();
      alert('Debug logs sent to server. Check server console for details.');
    }
  };

  const downloadLogs = () => {
    if ((window as any).momLogger) {
      (window as any).momLogger.downloadLogs();
    }
  };

  const clearLogs = () => {
    if ((window as any).momLogger) {
      (window as any).momLogger.clearLogs();
      setLogCount(0);
      setErrorCount(0);
    }
  };

  // Always show on Windows, or if there are errors, or if debug mode is on
  const shouldShow = isWindows || errorCount > 0 || 
    (typeof window !== 'undefined' && window.location.search.includes('debug=true'));

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-300 dark:border-gray-600 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            🔍 Debug Mode {isWindows && '(Windows)'}
          </span>
          {errorCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
              {errorCount} errors
            </span>
          )}
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
            {logCount} logs
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={showDebugPanel}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            title="Show debug panel with all logs"
          >
            Show Panel
          </button>
          <button
            onClick={sendLogs}
            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
            title="Send logs to server for analysis"
          >
            Send Logs
          </button>
          <button
            onClick={downloadLogs}
            className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
            title="Download logs as JSON file"
          >
            Download
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            title="Clear all logs"
          >
            Clear
          </button>
        </div>

        {isWindows && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            ⚠️ Windows detected - All operations are being logged
          </div>
        )}
      </div>
    </div>
  );
}