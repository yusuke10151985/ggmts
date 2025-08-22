'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { translateText } from '@/services/mom/api';
import { Translation, Attachment } from '@/types/mom';
import { compareMOMs, getRevisionColor } from '@/lib/mom/revision-utils';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { renderTextWithLineBreaks } from '@/utils/text-display';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import AttachmentButtons from './AttachmentButtons';
import { useLoadingState } from '@/hooks/mom/useLoadingState';

export default function MeetingDetails() {
  const { state, dispatch } = useMOM();
  const { currentMOM } = state;
  const { isAnyLoading } = useLoadingState();
  const [titleTranslations, setTitleTranslations] = useState<Translation | null>(null);
  const [goalTranslations, setGoalTranslations] = useState<Translation | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [goalTranslationLoading, setGoalTranslationLoading] = useState(false);
  const [translationTimer, setTranslationTimer] = useState<NodeJS.Timeout | null>(null);
  const [goalTranslationTimer, setGoalTranslationTimer] = useState<NodeJS.Timeout | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('auto');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  
  // Auto-resize textareas
  const titleTextareaRef = useAutoResizeTextarea(currentMOM?.title || '', 1, 5);
  const goalTextareaRef = useAutoResizeTextarea(currentMOM?.goal || '', 2, 8);
  
  // **SPEECH-TO-TEXT**: Hook for voice input on meeting title
  const { isListening, isSupported, error: speechError, startListening, stopListening } = useSpeechToText({
    onTranscript: (transcript) => {
      // **VOICE INPUT**: Append transcript to existing title
      const newTitle = (currentMOM?.title || '') + (currentMOM?.title ? ' ' : '') + transcript;
      dispatch({ type: 'UPDATE_MOM_FIELD', field: 'title', value: newTitle });
      // Trigger translation
      handleTitleChange({ target: { value: newTitle } } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>);
    },
    continuous: false,
    lang: 'ja-JP', // Japanese language
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'title', value });
    
    // **TRANSLATION PERSISTENCE**: Only re-translate if the text actually changed
    if (value === currentMOM?.title) {
      return; // No change, keep existing translations
    }
    
    // Clear previous timer
    if (translationTimer) {
      clearTimeout(translationTimer);
    }
    
    // Set new timer for debounced translation
    if (value.trim()) {
      const timer = setTimeout(async () => {
        setTranslationLoading(true);
        const response = await translateText(value, selectedLanguage);
        if (response.success && response.data) {
          setTitleTranslations(response.data);
          // Update detected language if auto-detection is enabled
          if (selectedLanguage === 'auto' && response.detectedLanguage) {
            setDetectedLanguage(response.detectedLanguage);
          }
          // **TRANSLATION PERSISTENCE**: Save translations to MOM data
          dispatch({ 
            type: 'UPDATE_MOM_FIELD', 
            field: 'titleTranslations', 
            value: response.data 
          });
        }
        setTranslationLoading(false);
      }, 1000); // 1 second debounce
      
      setTranslationTimer(timer);
    } else {
      setTitleTranslations(null);
      // **TRANSLATION PERSISTENCE**: Clear saved translations when title is cleared
      dispatch({ 
        type: 'UPDATE_MOM_FIELD', 
        field: 'titleTranslations', 
        value: undefined 
      });
    }
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'goal', value });
    
    // **TRANSLATION PERSISTENCE**: Only re-translate if the text actually changed
    if (value === currentMOM?.goal) {
      return; // No change, keep existing translations
    }
    
    // Clear previous timer
    if (goalTranslationTimer) {
      clearTimeout(goalTranslationTimer);
    }
    
    // Set new timer for debounced translation
    if (value.trim()) {
      const timer = setTimeout(async () => {
        setGoalTranslationLoading(true);
        const response = await translateText(value, selectedLanguage);
        if (response.success && response.data) {
          setGoalTranslations(response.data);
          // **TRANSLATION PERSISTENCE**: Save translations to MOM data
          dispatch({ 
            type: 'UPDATE_MOM_FIELD', 
            field: 'goalTranslations', 
            value: response.data 
          });
        }
        setGoalTranslationLoading(false);
      }, 1000); // 1 second debounce
      
      setGoalTranslationTimer(timer);
    } else {
      setGoalTranslations(null);
      // **TRANSLATION PERSISTENCE**: Clear saved translations when goal is cleared
      dispatch({ 
        type: 'UPDATE_MOM_FIELD', 
        field: 'goalTranslations', 
        value: undefined 
      });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'UPDATE_MOM_FIELD', field: 'date', value: e.target.value });
  };

  const getWeekday = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return weekdays[date.getDay()];
  };

  // **TRANSLATION PERSISTENCE**: Load saved translations when MOM loads
  useEffect(() => {
    if (currentMOM?.titleTranslations) {
      setTitleTranslations(currentMOM.titleTranslations);
    }
    if (currentMOM?.goalTranslations) {
      setGoalTranslations(currentMOM.goalTranslations);
    }
  }, [currentMOM?.momId, currentMOM?.revision]); // Reload when MOM changes

  useEffect(() => {
    return () => {
      if (translationTimer) {
        clearTimeout(translationTimer);
      }
      if (goalTranslationTimer) {
        clearTimeout(goalTranslationTimer);
      }
    };
  }, [translationTimer, goalTranslationTimer]);

  if (!currentMOM) return null;

  // **CRITICAL REQUIREMENT 2**: Check for differences from previous revision
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-gray-700">
                Meeting Title
                <span className="text-red-500 ml-1">*</span>
                {differences?.titleChanged && (
                  <span className={`ml-2 text-xs ${titleColorClass.split(' ')[0]}`}>
                    (Changed in Rev.{currentMOM.revision})
                  </span>
                )}
              </label>
              
              {/* **LANGUAGE DETECTION DISPLAY**: Show detected language to the right of Meeting Title */}
              {selectedLanguage === 'auto' && detectedLanguage !== 'auto' && (
                <span className="text-sm text-gray-500">
                  (Detected: <span className="font-semibold">{detectedLanguage.toUpperCase()}</span>)
                </span>
              )}
            </div>
            
            {/* **MANUAL LANGUAGE OVERRIDE DROPDOWN**: Allow manual language selection */}
            <select
              className="px-2 py-1 text-sm border border-gray-300 rounded"
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                // Re-trigger translation with new language setting
                if (currentMOM.title.trim()) {
                  handleTitleChange({ target: { value: currentMOM.title } } as any);
                }
              }}
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="th">Thai</option>
            </select>
          </div>
          
          <div className="relative">
            <textarea
              ref={titleTextareaRef}
              className={`form-control pr-10 ${differences?.titleChanged ? `border-2 ${titleColorClass}` : ''} resize-none overflow-hidden`}
              placeholder="Enter meeting title"
              value={currentMOM.title}
              onChange={handleTitleChange}
              rows={1}
              disabled={isAnyLoading}
            />
            {/* **MICROPHONE BUTTON WITH PRESS-AND-HOLD**: Start recording on mousedown, stop on mouseup */}
            {isSupported && (
              <button
                type="button"
                onMouseDown={async (e) => {
                  e.preventDefault();
                  await startListening();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  stopListening();
                }}
                onMouseLeave={() => {
                  if (isListening) stopListening();
                }} // Stop if mouse leaves button while pressed
                onTouchStart={async (e) => {
                  e.preventDefault();
                  await startListening();
                }} // Mobile support
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopListening();
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title="Hold to record"
                disabled={!!speechError}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </div>
          {/* **SPEECH ERROR**: Display speech recognition errors */}
          {speechError && (
            <div className="text-xs text-red-500 mt-1">
              {speechError}
            </div>
          )}
          
          {/* **HORIZONTAL TRANSLATION DISPLAY**: Show translations in EN: ... | JA: ... | TH: ... format */}
          {(titleTranslations || translationLoading) && (
            <div className="translation-display mt-2">
              {translationLoading ? (
                <div className="text-gray-500 italic text-sm">Translating...</div>
              ) : titleTranslations ? (
                <div className="text-sm text-gray-600">
                  <div><span className="font-semibold text-blue-600">EN:</span> {renderTextWithLineBreaks(titleTranslations.en)}</div>
                  <div><span className="font-semibold text-green-600">JA:</span> {renderTextWithLineBreaks(titleTranslations.ja)}</div>
                  <div><span className="font-semibold text-purple-600">TH:</span> {renderTextWithLineBreaks(titleTranslations.th)}</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        {/* **MEETING GOAL FIELD**: Meeting goal with auto-translation */}
        <div>
          <label className="block mb-2 font-semibold text-gray-700">
            Meeting Goal
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            ref={goalTextareaRef}
            className="form-control resize-none overflow-hidden"
            placeholder="Enter meeting goal or objective"
            value={currentMOM.goal || ''}
            onChange={handleGoalChange}
            rows={2}
            disabled={isAnyLoading}
          />
          {/* **GOAL TRANSLATIONS**: Display translated versions */}
          {(goalTranslations || goalTranslationLoading) && (
            <div className="translation-display mt-2">
              {goalTranslationLoading ? (
                <div className="text-gray-500 italic text-sm">Translating...</div>
              ) : goalTranslations ? (
                <div className="text-sm text-gray-600">
                  <div><span className="font-semibold text-blue-600">EN:</span> {renderTextWithLineBreaks(goalTranslations.en)}</div>
                  <div><span className="font-semibold text-green-600">JA:</span> {renderTextWithLineBreaks(goalTranslations.ja)}</div>
                  <div><span className="font-semibold text-purple-600">TH:</span> {renderTextWithLineBreaks(goalTranslations.th)}</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        <div>
          <label className="block mb-2 font-semibold text-gray-700">
            Meeting Date
            <span className="text-red-500 ml-1">*</span>
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
      </div>
      
      {/* **MEETING URLS**: URLs related to the meeting */}
      <div className="mt-6">
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
      
      {/* **MEETING ATTACHMENTS**: Using AttachmentButtons component */}
      <div className="mt-6">
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
    </section>
  );
  
}