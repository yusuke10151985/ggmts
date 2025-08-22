'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TranslationSet {
  en?: string;
  ja?: string;
  th?: string;
}

interface CompactCellProps {
  content: string;
  translations?: TranslationSet;
  isAction?: boolean;
  onEdit?: (value: string) => void;
  placeholder?: string;
}

// Portal component for rendering tooltip outside of table
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  
  return ReactDOM.createPortal(
    children,
    document.body
  );
};

// Translation-only tooltip component
const TranslationTooltip: React.FC<{
  translations: TranslationSet;
  position: { x: number; y: number };
}> = ({ translations, position }) => {
  // Don't show if no translations
  const hasTranslations = translations.en || translations.ja || translations.th;
  if (!hasTranslations) return null;
  
  return (
    <Portal>
      <div 
        className="fixed z-[9999] p-3 bg-white border border-gray-300 rounded-lg shadow-xl max-w-md min-w-[300px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: position.y < 200 ? 'translateY(0)' : 'translateY(-100%)'
        }}
      >
        <div className="space-y-2 text-sm">
          {translations.en && (
            <div>
              <span className="font-semibold text-gray-600">EN:</span>
              <div className="mt-1 text-gray-800">{translations.en}</div>
            </div>
          )}
          {translations.ja && (
            <div className="border-t pt-2">
              <span className="font-semibold text-gray-600">JA:</span>
              <div className="mt-1 text-gray-800">{translations.ja}</div>
            </div>
          )}
          {translations.th && (
            <div className="border-t pt-2">
              <span className="font-semibold text-gray-600">TH:</span>
              <div className="mt-1 text-gray-800">{translations.th}</div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

export const CompactCell: React.FC<CompactCellProps> = ({ 
  content, 
  translations,
  isAction = false,
  onEdit,
  placeholder = 'Enter text...'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const cellRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Check if content needs expand button (more than ~50 chars or has newlines)
  const needsExpand = content && (content.length > 50 || content.includes('\n'));
  
  const handleMouseEnter = () => {
    if (translations && (translations.en || translations.ja || translations.th)) {
      timeoutRef.current = setTimeout(() => {
        const rect = cellRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPosition({ 
            x: rect.left, 
            y: rect.top + rect.height + 5 
          });
          setShowTooltip(true);
        }
      }, 500);
    }
  };
  
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Handle editing
  if (isEditing && onEdit) {
    return (
      <textarea
        className="w-full p-1 border rounded resize-none text-sm focus:border-blue-500 focus:outline-none"
        defaultValue={content}
        onBlur={(e) => {
          onEdit(e.target.value);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onEdit(e.currentTarget.value);
            setIsEditing(false);
          }
          if (e.key === 'Escape') {
            setIsEditing(false);
          }
        }}
        autoFocus
        rows={3}
      />
    );
  }
  
  return (
    <div 
      ref={cellRef}
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className={`
          ${!isExpanded && needsExpand ? 'line-clamp-2' : ''}
          ${isAction ? 'text-blue-700 font-bold' : ''}
          text-sm leading-tight py-1 pr-6 cursor-text
          hover:bg-yellow-50 rounded px-1
          transition-colors duration-150
        `}
        onClick={() => onEdit && setIsEditing(true)}
      >
        {content || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
      
      {/* Expand/Collapse button */}
      {needsExpand && (
        <button
          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 
                     bg-blue-500 text-white rounded px-1.5 py-0.5 text-xs
                     hover:bg-blue-600 transition-all duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      )}
      
      {/* Translation Tooltip */}
      {showTooltip && translations && (
        <TranslationTooltip 
          translations={translations}
          position={tooltipPosition}
        />
      )}
    </div>
  );
};