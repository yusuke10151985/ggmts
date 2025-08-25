'use client';

import React from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { saveMOM, getSpreadsheetUrl, loadMOM, getMOMList } from '@/services/mom/api';
import CacheClearButton from './CacheClearButton';
import { validateRequiredFields, formatValidationErrors } from '@/lib/mom/validation-utils';
import { 
  FileText, 
  List, 
  PlusCircle, 
  Table, 
  CheckSquare, 
  Save, 
  Stamp,
  Loader2 
} from 'lucide-react';

interface HeaderProps {
  onShowSpreadsheet?: () => void;
  onShowTasks?: () => void;
  onShowList?: () => void;
}

export default function Header({ onShowSpreadsheet, onShowTasks, onShowList }: HeaderProps) {
  const { state, dispatch } = useMOM();
  const { currentMOM, hasUnsavedChanges, saving } = state;

  const handleCreateMOM = () => {
    // **UNSAVED CHANGES PROMPT**: Check for unsaved changes before creating new
    if (hasUnsavedChanges) {
      if (!confirm('Do you want to save this as a Draft before creating a new MOM?')) {
        dispatch({ type: 'RESET_CURRENT_MOM' });
      } else {
        // Save first then create new
        handleSaveDraft().then(() => {
          dispatch({ type: 'RESET_CURRENT_MOM' });
        });
      }
    } else {
      dispatch({ type: 'RESET_CURRENT_MOM' });
    }
  };

  const handleShowList = () => {
    // **UNSAVED CHANGES PROMPT**: Check for unsaved changes before navigating
    if (hasUnsavedChanges) {
      if (!confirm('Do you want to save this as a Draft before leaving?')) {
        // User doesn't want to save, proceed to list
        if (onShowList) {
          onShowList();
        } else {
          dispatch({ type: 'SET_CURRENT_MOM', payload: null });
        }
      } else {
        // User wants to save first
        handleSaveDraft().then(() => {
          if (onShowList) {
            onShowList();
          } else {
            dispatch({ type: 'SET_CURRENT_MOM', payload: null });
          }
        });
      }
    } else {
      // No unsaved changes, proceed normally
      if (onShowList) {
        onShowList();
      } else {
        dispatch({ type: 'SET_CURRENT_MOM', payload: null });
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!currentMOM || saving) return;
    
    // **VALIDATION**: Check required fields
    const validationErrors = validateRequiredFields(currentMOM);
    if (validationErrors.length > 0) {
      alert(formatValidationErrors(validationErrors));
      return;
    }
    
    dispatch({ type: 'SET_SAVING', payload: true });
    
    // Check if we have a pre-generated MOM ID for copy operation
    let momToSave = currentMOM;
    if (currentMOM.momId === 'New MOM' && (window as any).__newMOMId) {
      momToSave = {
        ...currentMOM,
        momId: (window as any).__newMOMId
      };
      // Clear the stored ID after use
      delete (window as any).__newMOMId;
    }
    
    const response = await saveMOM(momToSave, true);
    
    if (response.success && response.data) {
      // Update current MOM with saved data - IMPORTANT: Use the response data
      const updatedMOM = {
        ...currentMOM,
        momId: response.data.momId,
        revision: response.data.revision,
        status: response.data.status as 'Draft' | 'Officially Issued',
      };
      
      dispatch({ 
        type: 'SET_CURRENT_MOM', 
        payload: updatedMOM 
      });
      
      // Mark as saved
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
      
      // Update the MOM list to reflect the new draft
      const listResponse = await getMOMList();
      if (listResponse.success && listResponse.data) {
        dispatch({ type: 'SET_MOM_LIST', payload: listResponse.data });
      }
      
      alert(`Saved as Draft: ${response.data.momId} Rev.${response.data.revision}`);
    } else {
      alert('Failed to save: ' + (response.error || 'Unknown error'));
    }
    
    dispatch({ type: 'SET_SAVING', payload: false });
  };

  const handleOfficialIssue = async () => {
    if (!currentMOM || saving) return;
    
    // Validation before official issue
    const validationErrors = validateRequiredFields(currentMOM);
    if (validationErrors.length > 0) {
      alert(formatValidationErrors(validationErrors));
      return;
    }
    
    if (!confirm('Are you sure you want to officially issue this MOM?\n\nOnce issued, it cannot be edited. A new revision will be created for any future changes.')) {
      return;
    }
    
    dispatch({ type: 'SET_SAVING', payload: true });
    
    const response = await saveMOM(currentMOM, false); // false = official issue
    
    if (response.success && response.data) {
      // Update current MOM with saved data
      const updatedMOM = {
        ...currentMOM,
        momId: response.data.momId,
        revision: response.data.revision,
        status: response.data.status as 'Draft' | 'Officially Issued',
        // Keep all other fields unchanged
      };
      
      dispatch({ 
        type: 'SET_CURRENT_MOM', 
        payload: updatedMOM 
      });
      
      // Mark as saved
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
      
      // Update the MOM list
      const listResponse = await getMOMList();
      if (listResponse.success && listResponse.data) {
        dispatch({ type: 'SET_MOM_LIST', payload: listResponse.data });
      }
      
      alert(`Officially Issued: ${response.data.momId} Rev.${response.data.revision}`);
    } else {
      alert('Failed to issue: ' + (response.error || 'Unknown error'));
    }
    
    dispatch({ type: 'SET_SAVING', payload: false });
  };

  const openSpreadsheet = async () => {
    const response = await getSpreadsheetUrl();
    if (response.success && response.data?.url) {
      window.open(response.data.url, '_blank');
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left side - Navigation buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShowList}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          >
            <List className="w-4 h-4" />
            <span>MOM List</span>
          </button>
          
          <button
            onClick={handleCreateMOM}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New MOM</span>
          </button>

          {onShowSpreadsheet && (
            <button
              onClick={onShowSpreadsheet}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              <Table className="w-4 h-4" />
              <span>Spreadsheet</span>
            </button>
          )}

          {onShowTasks && (
            <button
              onClick={onShowTasks}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-orange-500 dark:border-orange-400 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Task List</span>
            </button>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {/* Cache Clear Button - for debugging */}
          <CacheClearButton />
          
          {currentMOM && (
            <>
              {/* Current MOM Info */}
              <div className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {currentMOM.momId === 'New MOM' ? 'New MOM' : `${currentMOM.momId} Rev.${currentMOM.revision}`}
                </span>
                {currentMOM.status && (
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                    currentMOM.status === 'Draft' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {currentMOM.status}
                  </span>
                )}
                {hasUnsavedChanges && (
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">
                    ● Unsaved Changes
                  </span>
                )}
              </div>

              {/* Save as Draft button */}
              <button
                onClick={handleSaveDraft}
                disabled={saving || !hasUnsavedChanges}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                  saving || !hasUnsavedChanges
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Draft</span>
              </button>

              {/* Official Issue button - only show if MOM is a draft */}
              {currentMOM.status !== 'Officially Issued' && (
                <button
                  onClick={handleOfficialIssue}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                    saving
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700'
                  }`}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Stamp className="w-4 h-4" />
                  )}
                  <span>Official Issue</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}