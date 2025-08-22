'use client';

import React, { useState, useEffect } from 'react';
import { useMOM } from '@/contexts/mom/MOMContext';
import { StructureItem, ResponsibleParty, Attachment, Translation } from '@/types/mom';
import ResponsiblePartiesModal from '@/components/mom/ResponsiblePartiesModal';
import AttachmentButtons from '@/components/mom/AttachmentButtons';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { translateText } from '@/services/mom/api';
import { renderTextWithLineBreaks } from '@/utils/text-display';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

interface Props {
  item: StructureItem;
}

export default function ActionContent({ item }: Props) {
  const { dispatch, state } = useMOM();
  const [showResponsibleModal, setShowResponsibleModal] = useState(false);
  const [detailsTranslations, setDetailsTranslations] = useState<Translation | null>(item.detailsTranslations || null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationTimer, setTranslationTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Auto-resize textarea
  const detailsTextareaRef = useAutoResizeTextarea(item.details || '', 2, 10);
  
  // **SPEECH-TO-TEXT**: Hook for voice input on action details
  const { isListening, isSupported, error: speechError, startListening, stopListening } = useSpeechToText({
    onTranscript: (transcript) => {
      // **VOICE INPUT**: Append transcript to existing action details
      const newDetails = (item.details || '') + (item.details ? ' ' : '') + transcript;
      updateItem({ details: newDetails });
      handleDetailsTranslation(newDetails);
    },
    continuous: false,
    lang: 'en-US',
  });

  const updateItem = (updates: Partial<StructureItem>) => {
    dispatch({
      type: 'UPDATE_STRUCTURE_ITEM',
      id: item.id,
      updates,
    });
  };

  // **ACTION DETAILS TRANSLATION**: Handle automatic translation with debouncing
  const handleDetailsTranslation = (details: string) => {
    // Clear previous timer
    if (translationTimer) {
      clearTimeout(translationTimer);
    }

    // Set new timer for debounced translation
    if (details.trim()) {
      const timer = setTimeout(async () => {
        setTranslationLoading(true);
        const response = await translateText(details, 'auto');
        if (response.success && response.data) {
          setDetailsTranslations(response.data);
          // Save translations to the item data
          updateItem({ detailsTranslations: response.data });
        }
        setTranslationLoading(false);
      }, 1000); // 1 second debounce

      setTranslationTimer(timer);
    } else {
      setDetailsTranslations(null);
      // Clear saved translations when text is cleared
      updateItem({ detailsTranslations: undefined });
    }
  };

  // Load existing translations on mount
  useEffect(() => {
    if (item.detailsTranslations) {
      setDetailsTranslations(item.detailsTranslations);
    }
  }, [item.detailsTranslations]);

  const handleStatusChange = (status: 'open' | 'closed') => {
    updateItem({ status });
  };

  const handleDueDateChange = (dueDate: string) => {
    updateItem({ dueDate });
  };


  return (
    <div className="bg-white p-4 rounded-md border border-gray-200 mt-3">
      {/* Status */}
      <div className="mb-3 flex items-center">
        <label className="font-semibold text-gray-700 mr-3">Status:</label>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md mr-3"
          value={item.status || 'open'}
          onChange={(e) => handleStatusChange(e.target.value as 'open' | 'closed')}
        >
          <option value="open" className="text-green-600">Open</option>
          <option value="closed" className="text-red-600">Closed</option>
        </select>
        <span className={`font-bold text-lg ${
          (item.status || 'open') === 'open' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {(item.status || 'open').toUpperCase()}
        </span>
      </div>

      {/* **ACTION DETAILS**: Textarea with voice input */}
      <div className="mb-3">
        <label className="font-bold text-blue-600 text-lg block mb-2">Action Details:</label>
        <div className="relative">
          <textarea
            ref={detailsTextareaRef}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md resize-none overflow-hidden font-bold text-blue-600 text-lg"
            rows={2}
            placeholder="Enter action details..."
            value={item.details || ''}
            onChange={(e) => {
              updateItem({ details: e.target.value });
              handleDetailsTranslation(e.target.value);
            }}
          />
          {/* **MICROPHONE BUTTON WITH PRESS-AND-HOLD**: Start recording on mousedown, stop on mouseup */}
          {isSupported && (
            <button
              type="button"
              onMouseDown={() => startListening()}
              onMouseUp={() => stopListening()}
              onMouseLeave={() => stopListening()} // Stop if mouse leaves button while pressed
              onTouchStart={() => startListening()} // Mobile support
              onTouchEnd={() => stopListening()}
              className={`absolute right-2 top-2 p-1.5 rounded-md transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Hold to record"
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
        
        {/* **ACTION DETAILS TRANSLATIONS**: Display translations in horizontal format */}
        {detailsTranslations && (
          <div className="mt-2 text-sm text-gray-600">
            <div className="font-bold text-blue-600"><span className="font-bold">EN:</span> {renderTextWithLineBreaks(detailsTranslations.en)}</div>
            <div className="font-bold text-blue-600"><span className="font-bold">JA:</span> {renderTextWithLineBreaks(detailsTranslations.ja)}</div>
            <div className="font-bold text-blue-600"><span className="font-bold">TH:</span> {renderTextWithLineBreaks(detailsTranslations.th)}</div>
          </div>
        )}
        {translationLoading && (
          <div className="text-xs text-gray-500 mt-1">Translating...</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mb-4">
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowResponsibleModal(true)}
          >
            Responsible Parties
            {item.responsibleParties && item.responsibleParties.length > 0 && (
              <span className="ml-1">({item.responsibleParties.length})</span>
            )}
          </button>
          
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => document.getElementById(`due-date-${item.id}`)?.focus()}
          >
            Due Date
          </button>
        </div>
        
        {/* Attachment Buttons Component */}
        <AttachmentButtons
          urls={item.urls || []}
          attachments={item.attachments || []}
          onUpdate={(updates) => {
            updateItem(updates);
          }}
        />
      </div>

      {/* Responsible Parties Display */}
      {item.responsibleParties && item.responsibleParties.length > 0 && (
        <div className="mb-3">
          <strong>Responsible:</strong>{' '}
          {item.responsibleParties.map(p => p.name).join(', ')}
        </div>
      )}

      {/* Due Date */}
      <div className="mb-3">
        <label className="font-semibold text-gray-700 mr-3">Due Date:</label>
        <input
          id={`due-date-${item.id}`}
          type="date"
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={item.dueDate || ''}
          onChange={(e) => handleDueDateChange(e.target.value)}
        />
      </div>


      {/* Modals */}
      {showResponsibleModal && (
        <ResponsiblePartiesModal
          currentParties={item.responsibleParties || []}
          onSave={(parties) => {
            updateItem({ responsibleParties: parties });
            setShowResponsibleModal(false);
          }}
          onClose={() => setShowResponsibleModal(false)}
        />
      )}

    </div>
  );
}