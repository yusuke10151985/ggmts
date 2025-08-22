# Unicode PDF Export Implementation Guide

This guide explains how to implement proper Unicode support for PDF export using pdfmake with embedded fonts.

## Current Implementation Status

The Unicode PDF export is implemented with a minimal font approach that relies on PDF viewer font substitution. This provides a working solution without large embedded fonts.

### Files Created:

1. **`export-pdf-unicode-pdfmake.ts`** - Main Unicode-aware PDF export function
2. **`pdf-unicode-fonts-minimal.ts`** - Minimal font configuration
3. **`pdf-fonts-unicode.ts`** - Full font embedding template (requires actual fonts)
4. **`scripts/download-noto-fonts.js`** - Script to download and convert fonts

## How It Works

### Current Approach (Minimal Fonts)

The current implementation uses a minimal font configuration that:
- Detects Unicode characters in text
- Assigns appropriate font families (NotoSans for Unicode, Roboto for ASCII)
- Relies on PDF viewers to substitute system fonts for Unicode characters
- URLs are set to 8px font size as requested

### Benefits:
- ✅ Small file size (no large embedded fonts)
- ✅ Japanese and Thai characters display correctly in most PDF viewers
- ✅ Text remains selectable
- ✅ No WinAnsi encoding errors

### Limitations:
- ⚠️ Font appearance depends on viewer's system fonts
- ⚠️ May not display correctly if viewer lacks appropriate fonts

## Full Unicode Implementation (With Embedded Fonts)

To implement full Unicode support with embedded Noto Sans fonts:

### Step 1: Download Fonts

Run the provided script to download Noto Sans fonts:

```bash
cd utils/scripts
node download-noto-fonts.js
```

This will:
- Download Noto Sans JP and Noto Sans Thai fonts
- Convert them to base64
- Generate `utils/fonts/noto-fonts-base64-generated.ts`

### Step 2: Update Font Configuration

Update `pdf-fonts-unicode.ts` to import the generated fonts:

```typescript
import { NOTO_SANS_REGULAR_BASE64, NOTO_SANS_BOLD_BASE64 } from './fonts/noto-fonts-base64-generated';
```

### Step 3: Switch to Full Font Implementation

In `export-pdf-unicode-pdfmake.ts`, change the import:

```typescript
// Change from:
import { setupPdfMakeMinimalUnicode, FontUtils } from './pdf-unicode-fonts-minimal';

// To:
import { setupPdfMakeUnicodeFonts, getAppropriateFont } from './pdf-fonts-unicode';
```

And update all `FontUtils.getFont` calls to `getAppropriateFont`.

## Alternative: Manual Font Setup

If the script doesn't work, you can manually set up fonts:

1. Download fonts from Google Fonts:
   - [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)
   - [Noto Sans Thai](https://fonts.google.com/noto/specimen/Noto+Sans+Thai)

2. Convert to base64:
   - Use an online converter: https://www.giftofspeed.com/base64-encoder/
   - Or use Node.js:
   ```javascript
   const fs = require('fs');
   const font = fs.readFileSync('NotoSansJP-Regular.otf');
   const base64 = font.toString('base64');
   fs.writeFileSync('font-base64.txt', base64);
   ```

3. Create `utils/fonts/noto-fonts-base64.ts`:
   ```typescript
   export const NOTO_SANS_REGULAR_BASE64 = 'paste-base64-here';
   export const NOTO_SANS_BOLD_BASE64 = 'paste-base64-here';
   ```

## Font Size Configuration

The implementation sets appropriate font sizes:
- Title: 18px
- Headings: 14px, 12px, 11px
- Normal text: 10px
- Small text: 9px
- **URLs: 8px** (as requested)
- Translations: 9px

## Testing

Test the PDF export with:
- English text: Should use Roboto font
- Japanese text: 日本語のテキスト
- Thai text: ข้อความภาษาไทย
- Mixed text: English and 日本語 mixed

## Troubleshooting

### "WinAnsi encoding" errors
- The current implementation avoids these by using proper font assignment
- If you see these errors, ensure fonts are properly loaded

### Characters appear as boxes or missing
- Check that the PDF viewer has appropriate system fonts
- Consider switching to full embedded fonts implementation

### Large file sizes with embedded fonts
- Noto Sans fonts can be 10-20MB when embedded
- Consider using font subsetting to include only needed characters
- Or stick with the minimal font approach for smaller files

## Production Recommendations

1. **For web applications**: Use the minimal font approach to keep file sizes small
2. **For desktop applications**: Consider embedding full fonts for consistent rendering
3. **For international users**: Test with various PDF viewers and systems
4. **Consider CDN**: Load fonts from CDN to reduce bundle size

## Future Improvements

1. Implement font subsetting to reduce file size
2. Add support for more languages (Arabic, Hebrew, etc.)
3. Create a font service to dynamically load only needed character sets
4. Implement server-side PDF generation with proper font handling