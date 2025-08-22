'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TooltipCellProps {
  content: string;
  maxLength?: number;
  className?: string;
  translations?: {
    en?: string;
    ja?: string;
    th?: string;
  };
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

export const TooltipCell: React.FC<TooltipCellProps> = ({ 
  content, 
  maxLength = 50,
  className = '',
  translations
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const cellRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const isLongText = content && content.length > maxLength;
  const displayText = content 
    ? (isLongText ? content.substring(0, maxLength) + '...' : content)
    : '';
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isLongText || translations) {
      // Delay showing tooltip to prevent accidental triggers
      timeoutRef.current = setTimeout(() => {
        const rect = cellRef.current?.getBoundingClientRect();
        if (rect) {
          // Calculate position to keep tooltip on screen
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          let x = rect.left;
          let y = rect.top - 10;
          
          // Adjust horizontal position if tooltip would go off right edge
          if (x + 400 > viewportWidth) {
            x = viewportWidth - 420;
          }
          
          // Adjust vertical position if tooltip would go off top edge
          if (y < 100) {
            y = rect.bottom + 10;
          }
          
          setTooltipPosition({ x, y });
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
  
  return (
    <>
      <div 
        ref={cellRef}
        className={`truncate ${isLongText || translations ? 'cursor-help' : ''} ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title=""
      >
        {displayText || <span className="text-gray-400">-</span>}
      </div>
      
      {showTooltip && (isLongText || translations) && (
        <Portal>
          <div
            className="fixed z-[9999] p-3 bg-white border border-gray-300 rounded-lg shadow-xl max-w-md"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: tooltipPosition.y < 100 ? 'translateY(0)' : 'translateY(-100%)'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="space-y-2">
              {isLongText && (
                <div className="whitespace-pre-wrap break-words text-sm">
                  {content}
                </div>
              )}
              
              {translations && (
                <div className="text-xs text-gray-600 border-t pt-2 mt-2 space-y-1">
                  {translations.en && (
                    <div><span className="font-semibold">EN:</span> {translations.en}</div>
                  )}
                  {translations.ja && (
                    <div><span className="font-semibold">JA:</span> {translations.ja}</div>
                  )}
                  {translations.th && (
                    <div><span className="font-semibold">TH:</span> {translations.th}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
};

// Compact display components for metadata
export const CompactResponsibleCell: React.FC<{ responsible: any[] }> = ({ responsible }) => {
  const names = responsible.map(r => r.name).join(', ');
  return (
    <div className="text-center">
      <TooltipCell content={names} maxLength={10} className="text-sm" />
    </div>
  );
};

export const CompactFilesCell: React.FC<{ files: any[]; urls: string[] }> = ({ files, urls }) => {
  const totalCount = files.length + urls.length;
  
  if (totalCount === 0) return <span className="text-gray-400 text-sm">-</span>;
  
  return (
    <div className="flex items-center justify-center gap-1">
      {files.length > 0 && (
        <span className="text-xs cursor-help" title={`${files.length} file(s)`}>
          📎{files.length}
        </span>
      )}
      {urls.length > 0 && (
        <span className="text-xs cursor-help" title={`${urls.length} URL(s)`}>
          🔗{urls.length}
        </span>
      )}
    </div>
  );
};

export const CompactStatusCell: React.FC<{ status: string }> = ({ status }) => {
  if (!status) return <span className="text-gray-400 text-sm">-</span>;
  
  return (
    <span className={`text-sm font-medium ${
      status === 'open' ? 'text-red-600' : 'text-green-600'
    }`}>
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  );
};

export const CompactDateCell: React.FC<{ date: string }> = ({ date }) => {
  if (!date) return <span className="text-gray-400 text-sm">-</span>;
  
  // Format date to MM/DD
  const dateObj = new Date(date);
  const formatted = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
  
  return (
    <span className="text-sm" title={date}>
      {formatted}
    </span>
  );
};