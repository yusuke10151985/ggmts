'use client';

import React, { useState } from 'react';

interface TranslationSet {
  en?: string;
  ja?: string;
  th?: string;
}

interface TranslationCellProps {
  originalText: string;  // Stored but not displayed
  translations?: TranslationSet;
  onUpdate: (newText: string, sourceLang: 'en' | 'ja' | 'th') => Promise<void>;
  isAction?: boolean;
  cellType: 'main' | 'sub' | 'subsub' | 'action';
  placeholder?: string;
}

export const TranslationCell: React.FC<TranslationCellProps> = ({
  originalText,
  translations,
  onUpdate,
  isAction = false,
  cellType,
  placeholder = 'Click to add'
}) => {
  const [editingLang, setEditingLang] = useState<'en' | 'ja' | 'th' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if we have any translations
  const hasTranslations = translations && (translations.en || translations.ja || translations.th);
  
  // Check if content is long
  const isLongContent = (translations?.en?.length || 0) > 50 || 
                       (translations?.ja?.length || 0) > 50 || 
                       (translations?.th?.length || 0) > 50;
  
  // Start editing when clicking a translation
  const startEdit = (lang: 'en' | 'ja' | 'th', existingText?: string) => {
    setEditingLang(lang);
    setEditValue(existingText || '');
  };
  
  // Save and trigger re-translation
  const saveEdit = async () => {
    if (editingLang && editValue.trim()) {
      setIsSaving(true);
      try {
        await onUpdate(editValue, editingLang);
      } catch (error) {
        console.error('Error saving:', error);
      } finally {
        setIsSaving(false);
      }
    }
    setEditingLang(null);
  };
  
  const cancelEdit = () => {
    setEditingLang(null);
    setEditValue('');
  };
  
  // If editing, show input
  if (editingLang) {
    return (
      <div className="p-1">
        <div className="flex items-start gap-1">
          <span className="text-xs font-semibold text-gray-500 mt-2">
            {editingLang.toUpperCase()}:
          </span>
          <textarea
            className="flex-1 p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === 'Escape') {
                cancelEdit();
              }
            }}
            autoFocus
            rows={2}
            placeholder={`Enter text in ${editingLang.toUpperCase()}`}
            disabled={isSaving}
          />
        </div>
        {isSaving && (
          <div className="text-xs text-gray-500 mt-1">Translating...</div>
        )}
      </div>
    );
  }
  
  // If no translations and not editing, show placeholder
  if (!hasTranslations) {
    return (
      <div className="p-1 space-y-1">
        <div 
          className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 text-gray-400 italic text-sm"
          onClick={() => startEdit('en')}
        >
          {placeholder}
        </div>
      </div>
    );
  }
  
  // Always show all three languages, even if empty
  const displayTranslations = {
    en: translations?.en || '',
    ja: translations?.ja || '',
    th: translations?.th || ''
  };
  
  // Display translations only
  return (
    <div className={`space-y-0.5 p-1 ${!isExpanded && isLongContent ? 'max-h-16 overflow-hidden' : ''}`}>
      {/* English - Always show */}
      <div 
        className={`cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors ${
          isAction && displayTranslations.en ? 'text-blue-700 font-bold' : ''
        }`}
        onClick={() => startEdit('en', displayTranslations.en)}
        title="Click to edit"
      >
        <span className="text-xs font-semibold text-gray-500">EN:</span>
        <span className={`ml-1 text-sm ${!isExpanded ? 'line-clamp-1' : ''} ${!displayTranslations.en ? 'text-gray-400 italic' : ''}`}>
          {displayTranslations.en || '[Empty]'}
        </span>
      </div>
      
      {/* Japanese - Always show */}
      <div 
        className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
        onClick={() => startEdit('ja', displayTranslations.ja)}
        title="Click to edit"
      >
        <span className="text-xs font-semibold text-gray-500">JA:</span>
        <span className={`ml-1 text-sm ${!isExpanded ? 'line-clamp-1' : ''} ${!displayTranslations.ja ? 'text-gray-400 italic' : ''}`}>
          {displayTranslations.ja || '[空]'}
        </span>
      </div>
      
      {/* Thai - Always show */}
      <div 
        className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
        onClick={() => startEdit('th', displayTranslations.th)}
        title="Click to edit"
      >
        <span className="text-xs font-semibold text-gray-500">TH:</span>
        <span className={`ml-1 text-sm ${!isExpanded ? 'line-clamp-1' : ''} ${!displayTranslations.th ? 'text-gray-400 italic' : ''}`}>
          {displayTranslations.th || '[ว่าง]'}
        </span>
      </div>
      
      {/* Expand/Collapse button for long content */}
      {isLongContent && (
        <button
          className="text-xs text-blue-500 hover:text-blue-700 ml-1"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? '▼ Less' : '▶ More'}
        </button>
      )}
    </div>
  );
};