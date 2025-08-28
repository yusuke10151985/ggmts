'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Translation } from '@/types/mom';

interface MatrixMultilingualEditProps {
  initialValue: Translation;
  onSave: (translations: Translation) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

export default function MatrixMultilingualEdit({
  initialValue,
  onSave,
  onCancel,
  autoFocus = true
}: MatrixMultilingualEditProps) {
  const [translations, setTranslations] = useState<Translation>(initialValue);
  const enInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && enInputRef.current) {
      enInputRef.current.focus();
      enInputRef.current.select();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent, lang: 'en' | 'ja' | 'th') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Move to next language field or save
      if (lang === 'en') {
        document.getElementById('matrix-edit-ja')?.focus();
      } else if (lang === 'ja') {
        document.getElementById('matrix-edit-th')?.focus();
      } else {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Tab' && e.shiftKey && lang === 'en') {
      // Prevent going back from first field
      e.preventDefault();
    }
  };

  const handleSave = () => {
    onSave(translations);
  };

  return (
    <div className="matrix-multilingual-edit bg-white border-2 border-blue-500 rounded p-2 shadow-lg">
      <div className="space-y-2">
        {/* English */}
        <div className="flex items-center gap-2">
          <label htmlFor="matrix-edit-en" className="text-xs font-bold text-gray-600 w-8">
            EN:
          </label>
          <input
            ref={enInputRef}
            id="matrix-edit-en"
            type="text"
            value={translations.en}
            onChange={(e) => setTranslations({ ...translations, en: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'en')}
            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="English text..."
          />
        </div>

        {/* Japanese */}
        <div className="flex items-center gap-2">
          <label htmlFor="matrix-edit-ja" className="text-xs font-bold text-gray-600 w-8">
            JA:
          </label>
          <input
            id="matrix-edit-ja"
            type="text"
            value={translations.ja}
            onChange={(e) => setTranslations({ ...translations, ja: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'ja')}
            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="日本語テキスト..."
          />
        </div>

        {/* Thai */}
        <div className="flex items-center gap-2">
          <label htmlFor="matrix-edit-th" className="text-xs font-bold text-gray-600 w-8">
            TH:
          </label>
          <input
            id="matrix-edit-th"
            type="text"
            value={translations.th}
            onChange={(e) => setTranslations({ ...translations, th: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'th')}
            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="ข้อความภาษาไทย..."
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 mt-3 pt-2 border-t">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
        >
          Cancel (Esc)
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        >
          Save (Enter)
        </button>
      </div>
    </div>
  );
}