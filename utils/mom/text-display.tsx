// Utility functions for displaying text with proper formatting

import React from 'react';

/**
 * Renders text with preserved line breaks
 * Converts \n to <br /> elements for React display
 */
export function renderTextWithLineBreaks(text: string): React.ReactNode {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, index) => (
    <span key={index}>
      {line}
      {index < lines.length - 1 && <br />}
    </span>
  ));
}