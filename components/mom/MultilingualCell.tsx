'use client';

import React, { useState, useEffect } from 'react';
import { TranslationSet } from '@/types/mom';
// import { translateText } from '@/services/mom/api';

interface MultilingualCellProps {
  value: TranslationSet;
  onChange: (translations: TranslationSet) => void;
  isAction?: boolean;
  disabled?: boolean;
}

export default function MultilingualCell({
  value = { en: '', ja: '', th: '' },
  onChange,
  isAction = false,
  disabled = false
}: MultilingualCellProps) {
  const [editingLang, setEditingLang] = useState<'en' | 'ja' | 'th' | null>(null);
  const [localValue, setLocalValue] = useState<TranslationSet>(value || { en: '', ja: '', th: '' });
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setLocalValue(value || { en: '', ja: '', th: '' });
  }, [value]);

  const handleEdit = (lang: 'en' | 'ja' | 'th', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && !editingLang) {
      setEditingLang(lang);
    }
  };

  const handleChange = (lang: 'en' | 'ja' | 'th', text: string) => {
    const newValue = { ...localValue, [lang]: text };
    setLocalValue(newValue);
    // Immediately update parent for first character input
    if (!localValue[lang] && text) {
      onChange(newValue);
    }
  };

  const handleBlur = async () => {
    if (!editingLang || isTranslating) return;

    const editedText = localValue[editingLang];
    
    // If empty, just clear all fields
    if (!editedText.trim()) {
      const emptyTranslations = { en: '', ja: '', th: '' };
      setLocalValue(emptyTranslations);
      onChange(emptyTranslations);
      setEditingLang(null);
      return;
    }

    // Trigger translation for other languages
    setIsTranslating(true);
    try {
      // Direct API call
      const response = await fetch('/api/translate-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editedText,
          sourceLang: editingLang
        })
      });
      
      const result = await response.json();
      console.log('MultilingualCell translation response:', result);
      
      if (result.success && result.data) {
        // Keep the edited language value, update others with translations
        const newTranslations = {
          en: editingLang === 'en' ? editedText : result.data.en,
          ja: editingLang === 'ja' ? editedText : result.data.ja,
          th: editingLang === 'th' ? editedText : result.data.th
        };
        setLocalValue(newTranslations);
        onChange(newTranslations);
      } else {
        // Fallback if translation fails
        const fallbackTranslations = { ...localValue };
        fallbackTranslations[editingLang] = editedText;
        setLocalValue(fallbackTranslations);
        onChange(fallbackTranslations);
      }
    } catch (error) {
      console.error('Translation error:', error);
      // Keep the edited value even if translation fails
      onChange(localValue);
    } finally {
      setIsTranslating(false);
      setEditingLang(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditingLang(null);
      setLocalValue(value); // Reset to original value
    }
  };

  const hasContent = value.en || value.ja || value.th;

  return (
    <div className="multilingual-cell space-y-1">
      {/* English */}
      <div 
        className={`flex items-center gap-1 rounded px-1 ${disabled ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
        onClick={(e) => handleEdit('en', e)}
      >
        <span className="font-semibold text-xs text-gray-600 w-6">EN:</span>
        {editingLang === 'en' ? (
          <input
            type="text"
            value={localValue.en}
            onChange={(e) => handleChange('en', e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm ${!value.en ? 'text-gray-400 italic' : isAction ? 'font-bold text-blue-600' : ''}`}>
            {value.en || (disabled ? '-' : 'Click to edit')}
          </span>
        )}
      </div>

      {/* Japanese */}
      <div 
        className={`flex items-center gap-1 rounded px-1 ${disabled ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
        onClick={(e) => handleEdit('ja', e)}
      >
        <span className="font-semibold text-xs text-gray-600 w-6">JA:</span>
        {editingLang === 'ja' ? (
          <input
            type="text"
            value={localValue.ja}
            onChange={(e) => handleChange('ja', e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm ${!value.ja ? 'text-gray-400 italic' : ''}`}>
            {value.ja || (disabled ? '-' : 'クリックして編集')}
          </span>
        )}
      </div>

      {/* Thai */}
      <div 
        className={`flex items-center gap-1 rounded px-1 ${disabled ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
        onClick={(e) => handleEdit('th', e)}
      >
        <span className="font-semibold text-xs text-gray-600 w-6">TH:</span>
        {editingLang === 'th' ? (
          <input
            type="text"
            value={localValue.th}
            onChange={(e) => handleChange('th', e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm ${!value.th ? 'text-gray-400 italic' : ''}`}>
            {value.th || (disabled ? '-' : 'คลิกเพื่อแก้ไข')}
          </span>
        )}
      </div>
      
      {isTranslating && (
        <div className="text-xs text-gray-500 italic px-1">Translating...</div>
      )}
    </div>
  );
}