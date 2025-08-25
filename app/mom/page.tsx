'use client';

import { useEffect, useState } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import Header from '@/components/mom/Header';
import MOMList from '@/components/mom/MOMList';
import MOMEditor from '@/components/mom/MOMEditor';
import SpreadsheetViewer from '@/components/mom/SpreadsheetViewer';
import TaskList from '@/components/mom/TaskList';
import { getMOMList, getAttendees, getCompanies } from '@/services/mom/api';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
// Temporarily disabled for Windows compatibility
// import DebugButton from '@/components/mom/DebugButton';
// import logger from '@/lib/mom/client-logger';

export default function MOMPage() {
  const { state, dispatch } = useMOM();
  const { currentMOM, loading, error } = state;
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  useEffect(() => {
    // Log page load - temporarily disabled
    // if (logger) {
    //   logger.log('MOMPage', 'Page loaded', {
    //     platform: navigator.platform,
    //     userAgent: navigator.userAgent,
    //     url: window.location.href
    //   });
    // }
    
    loadMOMList();
    loadAllAttendees();
    loadAllCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMOMList = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const response = await getMOMList();
    
    if (response.success && response.data) {
      dispatch({ type: 'SET_MOM_LIST', payload: response.data });
    } else {
      dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load MOM list' });
    }
    
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const loadAllAttendees = async () => {
    const response = await getAttendees();
    if (response.success && response.data) {
      dispatch({ type: 'SET_ATTENDEES', payload: response.data });
    }
  };

  const loadAllCompanies = async () => {
    const response = await getCompanies();
    if (response.success && response.data) {
      dispatch({ type: 'SET_COMPANIES', payload: response.data });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="shadow-lg">
        {/* MOM Specific Header */}
        <div className="border-b">
          <Header 
              onShowSpreadsheet={() => {
                setShowSpreadsheet(true);
                setShowTasks(false);
              }}
              onShowTasks={() => {
                setShowTasks(true);
                setShowSpreadsheet(false);
              }}
              onShowList={() => {
                dispatch({ type: 'SET_CURRENT_MOM', payload: null });
                setShowSpreadsheet(false);
                setShowTasks(false);
                loadMOMList();
              }}
            />
          </div>
          
          <div className="p-6">
            {loading && state.momList.length === 0 && (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            {!error && (
              <>
                {showSpreadsheet ? (
                  <>
                    <div className="mb-4">
                      <button
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        onClick={() => setShowSpreadsheet(false)}
                      >
                        ← Back to {currentMOM ? 'Editor' : 'MOM List'}
                      </button>
                    </div>
                    <SpreadsheetViewer />
                  </>
                ) : showTasks ? (
                  <>
                    <div className="mb-4">
                      <button
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        onClick={() => setShowTasks(false)}
                      >
                        ← Back to {currentMOM ? 'Editor' : 'MOM List'}
                      </button>
                    </div>
                    <TaskList />
                  </>
                ) : (
                  <>
                    {currentMOM ? (
                      <MOMEditor />
                    ) : (
                      <MOMList />
                    )}
                  </>
                )}
              </>
            )}
        </div>
      </Card>
      {/* Temporarily disabled for Windows compatibility */}
      {/* <DebugButton /> */}
    </div>
  );
}