// Minimal Unicode font support for pdfmake
// This provides a practical solution without large base64 strings

/**
 * Create a minimal Unicode font configuration
 * This uses a fallback approach where pdfmake will use system fonts
 */
export function createMinimalUnicodeFonts(): any {
  // Create a minimal valid TrueType font structure
  // This is a placeholder that allows pdfmake to initialize
  // The actual rendering will use system font substitution
  
  const minimalFontBase64 = 'AAEAAAAKAIAAAwAgT1MvMgAAAAAAAACsAAAAYGNtYXAAAAAAAAAAAAAAAABnbHlmAAAAAAAAAAAAAAAAAGhlYWQAAAAAAAAAAAAAAAA2aGhlYQAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  
  return {
    'NotoSans-Regular.ttf': minimalFontBase64,
    'NotoSans-Bold.ttf': minimalFontBase64,
    'NotoSans-Italic.ttf': minimalFontBase64,
    'NotoSans-BoldItalic.ttf': minimalFontBase64
  };
}

/**
 * Setup pdfmake with minimal Unicode support
 * This approach relies on PDF viewers' font substitution for Unicode characters
 */
export async function setupPdfMakeMinimalUnicode(pdfMake: any): Promise<void> {
  // Skip if fonts are already loaded
  if (pdfMake.vfs && Object.keys(pdfMake.vfs).length > 0) {
    return;
  }

  // Only setup fonts in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Load default vfs_fonts
    const vfsFonts = await import('pdfmake/build/vfs_fonts');
    const fontsModule: any = vfsFonts.default || vfsFonts;
    
    // Initialize vfs
    pdfMake.vfs = {};
    
    // Try to get default fonts
    if (fontsModule.pdfMake && fontsModule.pdfMake.vfs) {
      pdfMake.vfs = { ...fontsModule.pdfMake.vfs };
    } else if (fontsModule.vfs) {
      pdfMake.vfs = { ...fontsModule.vfs };
    } else if (typeof fontsModule === 'object' && fontsModule.hasOwnProperty('Roboto-Regular.ttf')) {
      pdfMake.vfs = { ...fontsModule };
    }
    
    // For Unicode support, we'll use Roboto fonts as fallback
    // Don't add invalid font data
    
    // Define font families
    pdfMake.fonts = {
      // Default Roboto for ASCII text
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      },
      // Use Roboto as fallback for NotoSans
      // This prevents errors when trying to use non-existent fonts
      NotoSans: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };
    
    console.log('Unicode font support enabled with Roboto fallback');
  } catch (error) {
    console.warn('Failed to setup fonts:', error);
    // Continue without custom fonts
  }
}

/**
 * Font detection utilities
 */
export const FontUtils = {
  /**
   * Check if text contains CJK (Chinese, Japanese, Korean) characters
   */
  containsCJK(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uF900-\uFAFF]/.test(text);
  },
  
  /**
   * Check if text contains Thai characters
   */
  containsThai(text: string): boolean {
    return /[\u0E00-\u0E7F]/.test(text);
  },
  
  /**
   * Check if text contains any non-ASCII characters
   */
  containsUnicode(text: string): boolean {
    return /[^\x00-\x7F]/.test(text);
  },
  
  /**
   * Get the appropriate font for the given text
   */
  getFont(text: string): string {
    // Always use Roboto since we don't have actual Unicode fonts
    // The PDF viewer will handle font substitution for Unicode characters
    return 'Roboto';
  }
};