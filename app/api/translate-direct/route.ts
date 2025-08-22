import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLang } = await request.json();
    
    console.log('Direct translation API called:', { text, sourceLang });
    
    if (!text) {
      return NextResponse.json({
        success: true,
        data: { en: '', ja: '', th: '' }
      });
    }
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      // Provide different mock translations based on source language
      console.log('No API key, providing mock translations');
      
      const mockTranslations: any = {
        ja: {
          en: `${text} (English)`,
          ja: text,
          th: `${text} (ไทย)`
        },
        en: {
          en: text,
          ja: `${text} (日本語)`,
          th: `${text} (ไทย)`
        },
        th: {
          en: `${text} (English)`,
          ja: `${text} (日本語)`,
          th: text
        }
      };
      
      return NextResponse.json({
        success: true,
        data: mockTranslations[sourceLang] || {
          en: `${text} (EN)`,
          ja: `${text} (JA)`,
          th: `${text} (TH)`
        }
      });
    }
    
    // Direct Gemini API call
    const prompt = `Translate "${text}" from ${sourceLang} to English, Japanese, and Thai.
Return ONLY a JSON object with keys "en", "ja", "th".
The ${sourceLang} translation should be the original text.
Example: {"en": "Hello", "ja": "こんにちは", "th": "สวัสดี"}`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gemini API error: ${response.status}`, errorBody);
      
      // 403エラーの場合は、APIキーの問題を明確に示す
      if (response.status === 403) {
        console.error('API Key authentication failed. Please check:');
        console.error('1. API key is valid and active');
        console.error('2. API key has proper permissions');
        console.error('3. Gemini API is enabled in Google Cloud Console');
        
        // モックデータを返す
        return NextResponse.json({
          success: true,
          data: {
            en: sourceLang === 'en' ? text : `${text} (EN - API Key Error)`,
            ja: sourceLang === 'ja' ? text : `${text} (JA - APIキーエラー)`,
            th: sourceLang === 'th' ? text : `${text} (TH - ข้อผิดพลาด API Key)`
          }
        });
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
    }
    
    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      const jsonMatch = generatedText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const translations = JSON.parse(jsonMatch[0]);
        
        // Ensure source language has original text
        translations[sourceLang] = text;
        
        return NextResponse.json({
          success: true,
          data: translations
        });
      }
    } catch (e) {
      console.error('Failed to parse translation:', e);
    }
    
    // Fallback
    return NextResponse.json({
      success: true,
      data: {
        en: sourceLang === 'en' ? text : `${text} (EN)`,
        ja: sourceLang === 'ja' ? text : `${text} (JA)`,
        th: sourceLang === 'th' ? text : `${text} (TH)`
      }
    });
    
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}