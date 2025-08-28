import { NextRequest, NextResponse } from 'next/server';
import { 
  translateFactoryTerm, 
  generateReading, 
  suggestRelatedTerms,
  generateTermDescription,
  detectLanguage,
  SourceLanguage 
} from '@/services/factory-dictionary/geminiService';

// POST: Translate factory terms or generate readings
export async function POST(request: NextRequest) {
  try {
    console.log('[Translate API] Request received');
    const body = await request.json();
    const { action, text, sourceLanguage, targetLanguage, context, category } = body;

    console.log('[Translate API] Body:', { action, text, sourceLanguage, targetLanguage, context, category });

    if (!text || !text.trim()) {
      console.log('[Translate API] Error: Text is required');
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'translate':
        if (!sourceLanguage) {
          console.log('[Translate API] Error: Source language is required');
          return NextResponse.json(
            { success: false, error: 'Source language is required for translation' },
            { status: 400 }
          );
        }

        console.log('[Translate API] Calling translateFactoryTerm...');
        const translationResult = await translateFactoryTerm(
          text,
          sourceLanguage as SourceLanguage,
          context
        );
        
        console.log('[Translate API] Translation result:', translationResult);

        if (!translationResult) {
          console.log('[Translate API] Translation returned null');
          return NextResponse.json({
            success: false,
            error: 'Translation failed - no result returned'
          });
        }

        return NextResponse.json({
          success: true,
          data: translationResult
        });

      case 'reading':
        if (!sourceLanguage || (sourceLanguage !== 'japanese' && sourceLanguage !== 'thai')) {
          return NextResponse.json(
            { success: false, error: 'Reading generation only supports Japanese and Thai' },
            { status: 400 }
          );
        }

        const readingResult = await generateReading(text, sourceLanguage);

        return NextResponse.json({
          success: true,
          data: readingResult
        });

      case 'suggest':
        if (!sourceLanguage) {
          return NextResponse.json(
            { success: false, error: 'Source language is required for suggestions' },
            { status: 400 }
          );
        }

        const suggestions = await suggestRelatedTerms(text, sourceLanguage as SourceLanguage);

        return NextResponse.json({
          success: true,
          data: suggestions
        });

      case 'description':
        if (!sourceLanguage) {
          return NextResponse.json(
            { success: false, error: 'Source language is required for description' },
            { status: 400 }
          );
        }

        const description = await generateTermDescription(
          text, 
          sourceLanguage as SourceLanguage, 
          category
        );

        return NextResponse.json({
          success: true,
          data: description
        });

      case 'detect':
        const detectedLang = await detectLanguage(text);

        return NextResponse.json({
          success: true,
          data: { language: detectedLang }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: translate, reading, suggest, description, detect' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in factory dictionary translate API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}