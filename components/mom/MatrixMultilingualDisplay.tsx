'use client';

import React from 'react';
import { Translation } from '@/types/mom';

interface MatrixMultilingualDisplayProps {
  translations: Translation;
  onEdit?: () => void;
  isEmpty?: boolean;
  showAllLanguages?: boolean;
}

export default function MatrixMultilingualDisplay({
  translations,
  onEdit,
  isEmpty = false,
  showAllLanguages = true
}: MatrixMultilingualDisplayProps) {
  
  // Check if there's any content
  const hasContent = translations.en || translations.ja || translations.th;
  
  if (isEmpty || !hasContent) {
    return (
      <div 
        className="matrix-cell-empty cursor-pointer hover:bg-gray-50 p-1 rounded"
        onClick={onEdit}
      >
        <div className="text-xs text-gray-400 italic">Click to edit all languages</div>
      </div>
    );
  }
  
  // Always show all languages
  return (
    <div 
      className="matrix-multilingual-display cursor-pointer hover:bg-gray-50 p-1 rounded"
      onClick={onEdit}
    >
      <div className="space-y-1">
        {/* English */}
        <div className="matrix-lang-item">
          <span className="matrix-lang-label">EN:</span>
          <span className="matrix-lang-value">{translations.en || '-'}</span>
        </div>
        
        {/* Japanese */}
        <div className="matrix-lang-item">
          <span className="matrix-lang-label">JA:</span>
          <span className="matrix-lang-value">{translations.ja || '-'}</span>
        </div>
        
        {/* Thai */}
        <div className="matrix-lang-item">
          <span className="matrix-lang-label">TH:</span>
          <span className="matrix-lang-value">{translations.th || '-'}</span>
        </div>
      </div>
    </div>
  );
}