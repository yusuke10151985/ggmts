/**
 * Summary formatting utilities for hierarchical numbered lists
 */

/**
 * Format summary output with proper hierarchical indentation
 */
export const formatSummaryOutput = (rawOutput: string): string => {
  // Clean up common issues
  let formatted = rawOutput;
  
  // Remove any "n/" artifacts if they exist
  formatted = formatted.replace(/n\//g, '\n');
  
  // Ensure proper line breaks
  formatted = formatted.replace(/\\n/g, '\n');
  
  // Fix common formatting issues
  // 1. Ensure space after numbers
  formatted = formatted.replace(/(\d+\.)([^\s])/g, '$1 $2');
  formatted = formatted.replace(/(\d+\.\d+)([^\s])/g, '$1 $2');
  formatted = formatted.replace(/(\d+\.\d+\.\d+)([^\s])/g, '$1 $2');
  
  // 2. Ensure proper indentation
  const lines = formatted.split('\n');
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    
    // Detect hierarchy level by number format
    if (/^\d+\./.test(trimmed)) {
      // Main level (1., 2., 3.)
      return trimmed;
    } else if (/^\d+\.\d+/.test(trimmed)) {
      // Sub level (1.1, 1.2)
      return '   ' + trimmed;
    } else if (/^\d+\.\d+\.\d+/.test(trimmed)) {
      // Sub-sub level (1.1.1, 1.1.2)
      return '      ' + trimmed;
    }
    
    // If no number detected but indented, preserve indentation
    if (line.startsWith('   ')) {
      return line;
    }
    
    return trimmed;
  });
  
  return formattedLines.join('\n');
};

/**
 * Validate if summary has proper hierarchical format
 */
export const validateSummaryFormat = (summary: string): boolean => {
  const lines = summary.split('\n').filter(line => line.trim());
  let hasHierarchy = false;
  let hasMainLevel = false;
  let hasSubLevel = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Check for main level numbers
    if (/^\d+\./.test(trimmed)) {
      hasMainLevel = true;
    }
    // Check for sub level numbers
    if (/^\d+\.\d+/.test(trimmed)) {
      hasSubLevel = true;
    }
  }
  
  // Consider it hierarchical if it has both main and sub levels, or at least main levels
  hasHierarchy = hasMainLevel && (lines.length > 1);
  
  return hasHierarchy;
};

/**
 * Add basic hierarchical numbering to plain text
 */
export const addHierarchicalNumbering = (text: string): string => {
  const lines = text.split('\n').filter(line => line.trim());
  let mainIndex = 1;
  let subIndex = 1;
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // If already numbered, return as-is with proper indentation
    if (/^\d+\./.test(trimmed)) {
      result.push(formatNumberedLine(trimmed));
      continue;
    }
    
    // Heuristics for determining hierarchy:
    // 1. Lines ending with colon are usually main topics
    // 2. Shorter lines (< 60 chars) are often headings
    // 3. Lines starting with dash or bullet are sub-items
    // 4. All caps or title case lines are often main topics
    const isMainTopic = 
      trimmed.endsWith(':') ||
      trimmed.length < 60 ||
      /^[A-Z\s]+$/.test(trimmed) || // All caps
      /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(trimmed); // Title case
    
    const isSubItem = 
      trimmed.startsWith('-') ||
      trimmed.startsWith('•') ||
      trimmed.startsWith('*') ||
      (i > 0 && lines[i-1].trim().endsWith(':'));
    
    if (isMainTopic && !isSubItem) {
      result.push(`${mainIndex}. ${trimmed.replace(/^[-•*]\s*/, '')}`);
      mainIndex++;
      subIndex = 1;
    } else {
      // It's a sub-point
      if (mainIndex === 1) {
        // If we haven't created a main point yet, create one
        result.push(`${mainIndex}. General Information`);
        mainIndex++;
      }
      result.push(`   ${mainIndex - 1}.${subIndex} ${trimmed.replace(/^[-•*]\s*/, '')}`);
      subIndex++;
    }
  }
  
  return result.join('\n');
};

/**
 * Format a numbered line with proper indentation
 */
function formatNumberedLine(line: string): string {
  const trimmed = line.trim();
  
  if (/^\d+\./.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) {
    // Main level
    return trimmed;
  } else if (/^\d+\.\d+/.test(trimmed) && !/^\d+\.\d+\.\d+/.test(trimmed)) {
    // Sub level
    return '   ' + trimmed;
  } else if (/^\d+\.\d+\.\d+/.test(trimmed)) {
    // Sub-sub level
    return '      ' + trimmed;
  }
  
  return trimmed;
}

/**
 * Normalize indentation across the summary
 */
export const normalizeIndentation = (text: string): string => {
  return text.split('\n').map(line => {
    if (/^\s*\d+\.\d+\.\d+/.test(line)) {
      return '      ' + line.trim(); // 6 spaces for sub-sub level
    }
    if (/^\s*\d+\.\d+/.test(line)) {
      return '   ' + line.trim(); // 3 spaces for sub level
    }
    if (/^\s*\d+\./.test(line)) {
      return line.trim(); // No indent for main level
    }
    return line;
  }).join('\n');
};

/**
 * Debug function to analyze summary structure
 */
export const debugSummaryStructure = (summary: string): void => {
  console.log('=== SUMMARY STRUCTURE DEBUG ===');
  console.log('Raw summary:', summary);
  console.log('Has valid hierarchy:', validateSummaryFormat(summary));
  
  const lines = summary.split('\n');
  console.log('Total lines:', lines.length);
  
  let mainCount = 0;
  let subCount = 0;
  let subSubCount = 0;
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (/^\d+\./.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) {
      mainCount++;
      console.log(`Line ${index + 1} [MAIN]: ${trimmed}`);
    } else if (/^\d+\.\d+/.test(trimmed) && !/^\d+\.\d+\.\d+/.test(trimmed)) {
      subCount++;
      console.log(`Line ${index + 1} [SUB]: ${trimmed}`);
    } else if (/^\d+\.\d+\.\d+/.test(trimmed)) {
      subSubCount++;
      console.log(`Line ${index + 1} [SUB-SUB]: ${trimmed}`);
    } else if (trimmed) {
      console.log(`Line ${index + 1} [PLAIN]: ${trimmed}`);
    }
  });
  
  console.log(`Structure: ${mainCount} main, ${subCount} sub, ${subSubCount} sub-sub`);
  console.log('==============================');
};