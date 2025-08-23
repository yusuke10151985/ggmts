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
  
  // Debug logging
  React.useEffect(() => {
    if (currentMOM) {
      // logger.log('Current MOM data:', {
      console.log('[MeetingDetails] Current MOM data:', {
        title: currentMOM.title,
        titleTranslations: currentMOM.titleTranslations,
        goal: currentMOM.goal,
        goalTranslations: currentMOM.goalTranslations,
        date: currentMOM.date,
        mainTimeSlot: currentMOM.mainTimeSlot,
        urls: currentMOM.urls,
        meetingAttachments: currentMOM.meetingAttachments
      });
      // });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    console.log('[MeetingDetails] No currentMOM available');
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
      
      <div className="space-y-6">
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
              value={currentMOM.date}
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