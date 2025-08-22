'use client';

import React from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { saveMOM, getSpreadsheetUrl, loadMOM, getMOMList } from '@/services/mom/api';
import { validateRequiredFields, formatValidationErrors } from '@/lib/mom/validation-utils';
import { FaClipboardList, FaListAlt, FaPlusCircle, FaTable, FaTasks, FaSave, FaStamp } from 'react-icons/fa';

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
      
      alert(response.data.message || 'MOM saved as draft');
      
      // **UNSAVED CHANGES**: Mark as saved
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
      
      // **MOM LIST REFRESH**: Refresh MOM list after save
      const listResponse = await getMOMList();
      if (listResponse.success && listResponse.data) {
        dispatch({ type: 'SET_MOM_LIST', payload: listResponse.data });
      }
      
      // If this was a new MOM, reload the full MOM data
      if (currentMOM.momId === 'New MOM') {
        const reloadResponse = await loadMOM(response.data.momId, response.data.revision);
        if (reloadResponse.success && reloadResponse.data) {
          dispatch({ type: 'SET_CURRENT_MOM', payload: reloadResponse.data });
        }
      }
    } else {
      dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to save MOM' });
    }
    
    dispatch({ type: 'SET_SAVING', payload: false });
  };

  const handleOfficiallyIssue = async () => {
    if (!currentMOM || saving) return;
    
    // **VALIDATION**: Check required fields
    const validationErrors = validateRequiredFields(currentMOM);
    if (validationErrors.length > 0) {
      alert(formatValidationErrors(validationErrors));
      return;
    }
    
    if (!confirm('Are you sure you want to officially issue this MOM? This action cannot be undone.')) {
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
    
    const response = await saveMOM(momToSave, false);
    
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
      
      alert(response.data.message || 'MOM officially issued');
      
      // **UNSAVED CHANGES**: Mark as saved
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
      
      // **MOM LIST REFRESH**: Refresh MOM list after official issue
      const listResponse = await getMOMList();
      if (listResponse.success && listResponse.data) {
        dispatch({ type: 'SET_MOM_LIST', payload: listResponse.data });
      }
      
      // If this was a new MOM or revision changed, reload the full MOM data
      if (currentMOM.momId === 'New MOM' || response.data.revision !== currentMOM.revision) {
        // Reload the MOM to get the updated data
        const reloadResponse = await loadMOM(response.data.momId, response.data.revision);
        if (reloadResponse.success && reloadResponse.data) {
          dispatch({ type: 'SET_CURRENT_MOM', payload: reloadResponse.data });
        }
      }
    } else {
      dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to issue MOM' });
    }
    
    dispatch({ type: 'SET_SAVING', payload: false });
  };

  const handleOpenSpreadsheet = async () => {
    if (onShowSpreadsheet) {
      onShowSpreadsheet();
    } else {
      // Fallback to opening in new tab
      const response = await getSpreadsheetUrl();
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    }
  };

  return (
    /* **FIXED HEADER**: The header uses 'sticky top-0 z-50' classes to remain fixed at the top when scrolling.
       - sticky: Makes the element stick to its container
       - top-0: Positions it at the top
       - z-50: Ensures it stays above other content
       - bg-white: Solid background to prevent content showing through
       - shadow-sm: Adds subtle shadow for depth */
    <header className="border-b-2 border-gray-200 p-4 bg-white sticky top-0 z-50 shadow-sm">
      <div className="flex justify-between items-center">
        <h1 className="text-gray-800 flex items-center gap-2">
          <FaClipboardList className="text-3xl text-blue-600" />
          MOM Manager
        </h1>
        
        <div className="flex gap-2 flex-wrap">
          <button
            className={`btn btn-secondary flex items-center gap-1 ${!currentMOM ? 'opacity-50' : ''}`}
            onClick={handleShowList}
          >
            <FaListAlt />
            MOM List
          </button>
          
          <button
            className="btn btn-secondary flex items-center gap-1"
            onClick={handleCreateMOM}
          >
            <FaPlusCircle />
            Create MOM
          </button>
          
          {currentMOM && (
            <>
              <button
                className={`btn btn-success flex items-center gap-1 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleSaveDraft}
                disabled={saving}
              >
                <FaSave />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              
              <button
                className={`btn btn-warning flex items-center gap-1 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleOfficiallyIssue}
                disabled={saving}
              >
                <FaStamp />
                {saving ? 'Saving...' : 'Officially Issue'}
              </button>
            </>
          )}
          
          <button
            className="btn btn-secondary flex items-center gap-1"
            onClick={handleOpenSpreadsheet}
          >
            <FaTable />
            Spreadsheet
          </button>
          
          {/* **TASK MANAGEMENT**: Button to view all tasks */}
          <button
            className="btn btn-secondary flex items-center gap-1"
            onClick={onShowTasks}
          >
            <FaTasks />
            Tasks
          </button>
        </div>
      </div>
    </header>
  );
}