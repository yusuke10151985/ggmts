'use client';

import React, { useState } from 'react';
import { Translation } from '@/types/mom';
import { ChevronDown, ChevronUp, Globe } from 'lucide-react';

interface MatrixMultilingualDisplayProps {
  translations: Translation;
  isEditing?: boolean;
  onEdit?: () => void;
  isEmpty?: boolean;
}

export default function MatrixMultilingualDisplay({
  translations,
  isEditing = false,
  onEdit,
  isEmpty = false
}: MatrixMultilingualDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if there's any content
  const hasContent = translations.en || translations.ja || translations.th;
  
  if (isEmpty || !hasContent) {
    return (
      <div 
        className="matrix-cell-empty cursor-pointer"
        onClick={onEdit}
      >
        Click to edit
      </div>
    );
  }
  
  // Primary language display (English as default)
  const primaryLang = translations.en || translations.ja || translations.th || '';
  const hasMultipleLangs = 
    (translations.en ? 1 : 0) + 
    (translations.ja ? 1 : 0) + 
    (translations.th ? 1 : 0) > 1;
  
  return (
    <div className="matrix-multilingual-display">
      {/* Primary display */}
      <div className="flex items-start gap-2">
        <div 
          className="flex-1 cursor-pointer"
          onClick={onEdit}
        >
          <div className="text-sm">{primaryLang}</div>
        </div>
        
        {/* Expand button if multiple languages */}
        {hasMultipleLangs && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? "Collapse languages" : "Expand languages"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>
      
      {/* Expanded languages */}
      {isExpanded && hasMultipleLangs && (
        <div className="mt-2 pl-2 border-l-2 border-gray-200 space-y-1">
          {translations.en && (
            <div className="matrix-lang-item">
              <span className="matrix-lang-label">EN:</span>
              <span className="matrix-lang-value">{translations.en}</span>
            </div>
          )}
          {translations.ja && (
            <div className="matrix-lang-item">
              <span className="matrix-lang-label">JA:</span>
              <span className="matrix-lang-value">{translations.ja}</span>
            </div>
          )}
          {translations.th && (
            <div className="matrix-lang-item">
              <span className="matrix-lang-label">TH:</span>
              <span className="matrix-lang-value">{translations.th}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}