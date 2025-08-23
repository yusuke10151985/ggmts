'use client';

import React from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
// Temporarily disabled for Windows compatibility
// import { useClientLogger } from '@/hooks/mom/useClientLogger';
import { Translation } from '@/types/mom';
import { compareMOMs, getRevisionColor } from '@/lib/mom/revision-utils';
import { getWeekday } from '@/utils/mom/date-helpers';
import AttachmentButtons from './AttachmentButtons';
import MultilingualInput from './MultilingualInput';
import { useLoadingState } from '@/hooks/mom/useLoadingState';

export default function MeetingDetails() {
  const { state, dispatch } = useMOM();
  const { currentMOM } = state;
  const { isAnyLoading } = useLoadingState();
  // Temporarily disabled for Windows compatibility
  // const logger = useClientLogger('MeetingDetails');
  
  // Debug logging - Re-enabled with detailed values
  React.useEffect(() => {
    if (currentMOM) {
      console.log('[MeetingDetails] Current MOM data - DETAILED:', {
        title: `"${currentMOM.title || ''}"`,
        titleLength: currentMOM.title?.length || 0,
        titleTranslations: currentMOM.titleTranslations,
        goal: `"${currentMOM.goal || ''}"`,
        goalLength: currentMOM.goal?.length || 0,
        goalTranslations: currentMOM.goalTranslations,
        date: `"${currentMOM.date || ''}"`,
        mainTimeSlot: currentMOM.mainTimeSlot,
        urls: currentMOM.urls,
        meetingAttachments: currentMOM.meetingAttachments
      });
    }
  }, [currentMOM]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'date', value: e.target.value });
  };

  const handleTitleChange = (translations: Translation) => {
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'titleTranslations', value: translations });
    // Update the main title with the English version for backward compatibility
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'title', value: translations.en || '' });
  };

  const handleGoalChange = (translations: Translation) => {
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'goalTranslations', value: translations });
    // Update the main goal with the English version for backward compatibility
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'goal', value: translations.en || '' });
  };

  if (!currentMOM) {
    // console.log('[MeetingDetails] No currentMOM available');
    return null;
  }

  // Check for differences from previous revision
  const differences = currentMOM.previousRevisionData 
    ? compareMOMs(currentMOM, currentMOM.previousRevisionData)
    : null;
  
  const titleColorClass = differences?.titleChanged 
    ? getRevisionColor(currentMOM.revision) 
    : '';
  
  const dateColorClass = differences?.dateChanged 
    ? getRevisionColor(currentMOM.revision) 
    : '';

  return (
    <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="mb-4">Meeting Details</h2>
      
      {/* Windows Diagnostic Display */}
      {typeof window !== 'undefined' && navigator.platform.includes('Win') && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
          <p className="font-bold text-sm">Windows Debug Info:</p>
          <p className="text-xs">Title: &quot;{currentMOM.title}&quot; (len: {currentMOM.title?.length || 0})</p>
          <p className="text-xs">Goal: &quot;{currentMOM.goal}&quot; (len: {currentMOM.goal?.length || 0})</p>
          <p className="text-xs">Date: &quot;{currentMOM.date}&quot; (len: {currentMOM.date?.length || 0})</p>
          <p className="text-xs">Title Trans EN: &quot;{currentMOM.titleTranslations?.en}&quot; (len: {currentMOM.titleTranslations?.en?.length || 0})</p>
          <p className="text-xs">Goal Trans EN: &quot;{currentMOM.goalTranslations?.en}&quot; (len: {currentMOM.goalTranslations?.en?.length || 0})</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Direct Display Test for Windows */}
        {typeof window !== 'undefined' && navigator.platform.includes('Win') && (
          <div className="p-3 border-2 border-blue-500 rounded mb-4">
            <p className="font-bold">Direct HTML Display Test:</p>
            <div className="mt-2">
              <label className="block font-semibold">Meeting Title (Direct):</label>
              <input 
                type="text" 
                value={currentMOM.title || ''} 
                readOnly 
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mt-2">
              <label className="block font-semibold">Meeting Goal (Direct):</label>
              <input 
                type="text" 
                value={currentMOM.goal || ''} 
                readOnly 
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        )}
        
        {/* Meeting Title with Multilingual Support */}
        <MultilingualInput
          label="Meeting Title"
          required={true}
          value={currentMOM.titleTranslations || { en: currentMOM.title || '', ja: '', th: '' }}
          onChange={handleTitleChange}
          disabled={isAnyLoading}
          className={differences?.titleChanged ? `border-2 ${titleColorClass}` : ''}
        />
        
        {/* Meeting Goal with Multilingual Support */}
        <MultilingualInput
          label="Meeting Goal"
          required={true}
          value={currentMOM.goalTranslations || { en: currentMOM.goal || '', ja: '', th: '' }}
          onChange={handleGoalChange}
          multiline={true}
          rows={2}
          disabled={isAnyLoading}
        />
      </div>
      
      {/* Meeting Date, URLs, and Attachments - Horizontal layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meeting Date */}
        <div>
          <label className="block mb-2 font-semibold text-gray-700">
            Meeting Date
            {differences?.dateChanged && (
              <span className={`ml-2 text-xs ${dateColorClass.split(' ')[0]}`}>
                (Changed in Rev.{currentMOM.revision})
              </span>
            )}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              className={`form-control ${differences?.dateChanged ? `border-2 ${dateColorClass}` : ''}`}
              value={currentMOM.date || ''}
              onChange={handleDateChange}
              disabled={isAnyLoading}
            />
            {currentMOM.date && (
              <div className="bg-green-100 border border-green-300 text-green-800 px-3 py-2 rounded font-semibold">
                {getWeekday(currentMOM.date)}
              </div>
            )}
          </div>
        </div>
        
        {/* Meeting URLs */}
        <div>
          <label className="block mb-2 font-semibold text-gray-700">
            Meeting URLs
          </label>
          <AttachmentButtons
            urls={currentMOM.urls || []}
            attachments={[]}
            showUrlButton={true}
            showFileButton={false}
            onUpdate={(updates) => {
              if (updates.urls !== undefined) {
                dispatch({ type: 'UPDATE_MOM_FIELD', field: 'urls', value: updates.urls });
              }
            }}
          />
        </div>
        
        {/* Meeting Attachments */}
        <div>
          <label className="block mb-2 font-semibold text-gray-700">
            Meeting Attachments
          </label>
          <AttachmentButtons
            urls={[]}
            attachments={currentMOM.meetingAttachments || []}
            showUrlButton={false}
            showFileButton={true}
            onUpdate={(updates) => {
              if (updates.attachments !== undefined) {
                dispatch({ type: 'UPDATE_MOM_FIELD', field: 'meetingAttachments', value: updates.attachments });
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}