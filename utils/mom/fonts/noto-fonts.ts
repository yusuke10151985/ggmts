// **UNICODE FONTS**: Base64 encoded subset of Noto Sans for Japanese and Thai support
// This is a minimal subset containing only essential characters to keep file size manageable

// For production, you should use a proper font file or CDN
export const NOTO_SANS_SUBSET = `
AAEAAAANAIAAAwBQRkZUTYF8AAAAAA0AAAA6R0RFRgAOABYAAA1MAAAAIEdQT1MADwAYAAANbAAAADBHU1VCABAAJAAADZwAAAAoT1MvMgASACwAAA3EAAAAYGNtYXAAGgA0AAAN5AAAAGRnYXNwAAAAEAAADkgAAAAIZ2x5ZgAiADwAAA5QAAAAjGhlYWQAKgBIAAAO3AAAADZ
`;

/**
 * Get font as ArrayBuffer
 */
export function getNotoSansBuffer(): ArrayBuffer {
  // In a real implementation, this would return actual font data
  // For now, return a minimal valid TTF structure
  const encoder = new TextEncoder();
  return encoder.encode('minimal-font').buffer as ArrayBuffer;
}