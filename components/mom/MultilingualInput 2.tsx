'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TranslationSet } from '@/types/mom';
import { translateText } from '@/services/mom/api';

interface MultilingualInputProps {
  label: string;
  required?: boolean;
  value?: TranslationSet;
  onChange: (translations: TranslationSet) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: {
    en?: string;
    ja?: string;
    th?: string;
  };
  className?: string;
  disabled?: boolean;
}

export default function MultilingualInput({
  label,
  required = false,
  value = { en: '', ja: '', th: '' },
  onChange,
  multiline = false,
  rows = 2,
  placeholder = {
    en: 'Click to edit',
    ja: 'クリックして編集',
    th: 'คลิกเพื่อแก้ไข'
  },
  className = '',
  disabled = false
}: MultilingualInputProps) {
  const [editingLang, setEditingLang] = useState<'en' | 'ja' | 'th' | null>(null);
  const [localValue, setLocalValue] = useState<TranslationSet>(value);
  const [isTranslating, setIsTranslating] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editingLang && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingLang]);

  const handleEdit = (lang: 'en' | 'ja' | 'th') => {
    if (!disabled) {
      setEditingLang(lang);
    }
  };

  const handleChange = (lang: 'en' | 'ja' | 'th', text: string) => {
    setLocalValue(prev => ({ ...prev, [lang]: text }));
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
      // Send the specific source language instead of 'auto'
      const response = await translateText(editedText, editingLang);
      console.log('Translation response:', response);
      
      if (response.success && response.data) {
        // Keep the edited language value, update others with translations
        const newTranslations = {
          en: editingLang === 'en' ? editedText : response.data.en,
          ja: editingLang === 'ja' ? editedText : response.data.ja,
          th: editingLang === 'th' ? editedText : response.data.th
        };
        
        // Verify translations are different from source
        if ((editingLang === 'ja' && (response.data.en === editedText || response.data.th === editedText)) ||
            (editingLang === 'en' && (response.data.ja === editedText || response.data.th === editedText)) ||
            (editingLang === 'th' && (response.data.en === editedText || response.data.ja === editedText))) {
          console.warn('Translation API returned same text for all languages, using fallback');
          // Use fallback translations if API isn't working properly
          if (editingLang === 'ja') {
            newTranslations.en = editedText + ' (EN)';
            newTranslations.th = editedText + ' (TH)';
          } else if (editingLang === 'en') {
            newTranslations.ja = editedText + ' (JA)';
            newTranslations.th = editedText + ' (TH)';
          } else if (editingLang === 'th') {
            newTranslations.en = editedText + ' (EN)';
            newTranslations.ja = editedText + ' (JA)';
          }
        }
        
        setLocalValue(newTranslations);
        onChange(newTranslations);
      } else {
        // If translation failed, use fallback
        console.error('Translation failed, using fallback');
        const fallbackTranslations = { ...localValue };
        fallbackTranslations[editingLang] = editedText;
        
        // Add language indicators for other languages
        if (editingLang === 'ja') {
          fallbackTranslations.en = fallbackTranslations.en || editedText + ' (EN)';
          fallbackTranslations.th = fallbackTranslations.th || editedText + ' (TH)';
        } else if (editingLang === 'en') {
          fallbackTranslations.ja = fallbackTranslations.ja || editedText + ' (JA)';
          fallbackTranslations.th = fallbackTranslations.th || editedText + ' (TH)';
        } else if (editingLang === 'th') {
          fallbackTranslations.en = fallbackTranslations.en || editedText + ' (EN)';
          fallbackTranslations.ja = fallbackTranslations.ja || editedText + ' (JA)';
        }
        
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
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditingLang(null);
      setLocalValue(value); // Reset to original value
    }
  };

  const renderLanguageRow = (lang: 'en' | 'ja' | 'th', langLabel: string) => {
    const isEditing = editingLang === lang;
    const displayValue = localValue[lang];
    const placeholderText = placeholder[lang] || placeholder.en || 'Click to edit';

    return (
      <div
        key={lang}
        className={`language-row flex items-start gap-2 py-2 px-3 rounded hover:bg-gray-50 cursor-pointer transition-colors ${
          isEditing ? 'bg-blue-50 ring-2 ring-blue-500' : ''
        }`}
        onClick={() => !isEditing && handleEdit(lang)}
      >
        <span className="lang-label font-semibold text-gray-600 w-8 flex-shrink-0 mt-1">
          {langLabel}:
        </span>
        {isEditing ? (
          multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={displayValue}
              onChange={(e) => handleChange(lang, e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="flex-1 p-1 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={rows}
              onClick={(e) => e.stopPropagation()}
              disabled={isTranslating}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={displayValue}
              onChange={(e) => handleChange(lang, e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="flex-1 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
              disabled={isTranslating}
            />
          )
        ) : (
          <span className={`flex-1 ${!displayValue ? 'text-gray-400 italic' : ''}`}>
            {displayValue || placeholderText}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`multilingual-input ${className}`}>
      <label className="block mb-2 font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {isTranslating && (
          <span className="ml-2 text-sm text-gray-500 italic">Translating...</span>
        )}
      </label>
      <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
        {renderLanguageRow('en', 'EN')}
        {renderLanguageRow('ja', 'JA')}
        {renderLanguageRow('th', 'TH')}
      </div>
    </div>
  );
}