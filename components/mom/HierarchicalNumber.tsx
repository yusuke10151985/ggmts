'use client';

import React from 'react';

interface Props {
  number: string;
  className?: string;
}

/**
 * Component to render hierarchical number with gap styling
 * Displays "0" parts in lighter color to indicate skipped levels
 */
export default function HierarchicalNumber({ number, className = '' }: Props) {
  const parts = number.split('.');
  const hasGap = parts.includes('0');
  
  return (
    <span className={`hierarchical-number ${hasGap ? 'has-gap' : ''} ${className}`}>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="separator">.</span>}
          <span className={part === '0' ? 'gap' : ''}>
            {part}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}