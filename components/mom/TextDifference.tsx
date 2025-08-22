// **TEXT DIFFERENCE HIGHLIGHTING**: Component to highlight text differences
import React from 'react';
import { getRevisionColor } from '@/lib/mom/revision-utils';

interface TextDifferenceProps {
  oldText: string;
  newText: string;
  revision: number;
}

export default function TextDifference({ oldText, newText, revision }: TextDifferenceProps) {
  if (oldText === newText) {
    return <span>{newText}</span>;
  }
  
  const oldWords = (oldText || '').split(/\s+/);
  const newWords = (newText || '').split(/\s+/);
  const colorClass = getRevisionColor(revision).split(' ')[0]; // Get text color only
  
  // Simple word-by-word comparison
  const result: React.ReactElement[] = [];
  let i = 0, j = 0;
  
  while (i < oldWords.length || j < newWords.length) {
    if (i >= oldWords.length) {
      // New words added
      result.push(
        <span key={`add-${j}`} className={`${colorClass} font-bold`}>
          {newWords[j]} 
        </span>
      );
      j++;
    } else if (j >= newWords.length) {
      // Words removed - skip
      i++;
    } else if (oldWords[i] === newWords[j]) {
      // Same word
      result.push(<span key={`same-${i}-${j}`}>{newWords[j]} </span>);
      i++;
      j++;
    } else {
      // Different word - show as changed
      result.push(
        <span key={`change-${j}`} className={`${colorClass} font-bold`}>
          {newWords[j]} 
        </span>
      );
      i++;
      j++;
    }
  }
  
  return <>{result}</>;
}