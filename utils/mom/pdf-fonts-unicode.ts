// PDF Fonts configuration for pdfmake with full Unicode support
// This file handles custom font loading for Japanese and Thai characters

// NOTE: To properly implement Unicode support, you need to:
// 1. Download Noto Sans CJK JP and Noto Sans Thai fonts from Google Fonts
// 2. Convert them to base64 using an online tool or Node.js script
// 3. Replace the placeholder strings below with actual base64 data
// 4. The base64 strings should be the actual font file content, not HTML

// Placeholder for actual font data - replace with real base64 encoded fonts
const NOTO_SANS_REGULAR_BASE64 = 'PLACEHOLDER_REGULAR_FONT_BASE64';
const NOTO_SANS_BOLD_BASE64 = 'PLACEHOLDER_BOLD_FONT_BASE64';

export interface CustomFonts {
  [fontName: string]: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
}

/**
 * Setup pdfmake with custom Unicode fonts
 */
export async function setupPdfMakeUnicodeFonts(pdfMake: any): Promise<void> {
  // Skip if fonts are already loaded
  if (pdfMake.vfs && pdfMake.vfs['NotoSans-Regular.ttf']) {
    return;
  }

  // Only load fonts in browser environment
  if (typeof window === 'undefined') {
    console.warn('Server-side PDF generation: Unicode fonts not available');
    return;
  }

  try {
    // Initialize vfs if not exists
    if (!pdfMake.vfs) {
      pdfMake.vfs = {};
    }

    // Load default Roboto fonts first
    try {
      const vfsFonts = await import('pdfmake/build/vfs_fonts');
      const fontsModule: any = vfsFonts.default || vfsFonts;
      
      let defaultVfs = null;
      if (fontsModule.pdfMake && fontsModule.pdfMake.vfs) {
        defaultVfs = fontsModule.pdfMake.vfs;
      } else if (fontsModule.vfs) {
        defaultVfs = fontsModule.vfs;
      } else if (typeof fontsModule === 'object') {
        defaultVfs = fontsModule;
      }
      
      if (defaultVfs) {
        // Merge default fonts with our vfs
        Object.assign(pdfMake.vfs, defaultVfs);
      }
    } catch (error) {
      console.warn('Could not load default PDF fonts:', error);
    }

    // Add Noto Sans fonts to VFS
    pdfMake.vfs['NotoSans-Regular.ttf'] = NOTO_SANS_REGULAR_BASE64;
    pdfMake.vfs['NotoSans-Bold.ttf'] = NOTO_SANS_BOLD_BASE64;
    
    // For italics, we'll use the regular font (Noto Sans doesn't have true italics)
    pdfMake.vfs['NotoSans-Italic.ttf'] = NOTO_SANS_REGULAR_BASE64;
    pdfMake.vfs['NotoSans-BoldItalic.ttf'] = NOTO_SANS_BOLD_BASE64;

    // Define font families
    const customFonts: CustomFonts = {
      // Keep default Roboto for compatibility
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      },
      // Add Noto Sans for Unicode support
      NotoSans: {
        normal: 'NotoSans-Regular.ttf',
        bold: 'NotoSans-Bold.ttf',
        italics: 'NotoSans-Italic.ttf',
        bolditalics: 'NotoSans-BoldItalic.ttf'
      }
    };

    // Set fonts on pdfMake
    pdfMake.fonts = customFonts;

    console.log('Unicode fonts loaded successfully');
  } catch (error) {
    console.error('Failed to load Unicode fonts:', error);
    // Continue without custom fonts - pdfmake will use defaults
  }
}

/**
 * Check if text contains characters that need Unicode font
 */
export function needsUnicodeFont(text: string): boolean {
  // Check for non-ASCII characters
  // This includes Japanese, Thai, Chinese, etc.
  return /[^\x00-\x7F]/.test(text);
}

/**
 * Get appropriate font for text content
 */
export function getAppropriateFont(text: string): string {
  return needsUnicodeFont(text) ? 'NotoSans' : 'Roboto';
}