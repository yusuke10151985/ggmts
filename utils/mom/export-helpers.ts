// Export helper functions

/**
 * Preserves line breaks in text for HTML export
 * Converts \n to <br> tags for HTML display
 */
export function preserveLineBreaksHTML(text: string): string {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

/**
 * Preserves line breaks in text for Markdown export
 * Adds two spaces before \n for proper Markdown line breaks
 */
export function preserveLineBreaksMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/\n/g, '  \n');
}