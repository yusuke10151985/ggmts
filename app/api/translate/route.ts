import { NextRequest, NextResponse } from 'next/server';
import { translationService } from '@/services/mom/translationService';
import { translationMonitor } from '@/services/mom/translationMonitor';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  try {
    const { text, sourceLang } = await request.json();
    
    // Debug: Log incoming request
    console.log('=== Translation API Request ===');
    console.log('Input text:', text);
    console.log('Source language:', sourceLang);
    console.log('Text encoding check:', {
      length: text?.length,
      charCodes: text ? text.split('').map((char: string) => char.charCodeAt(0)) : [],
      isJapanese: text ? /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) : false
    });

    if (!text) {
      console.log('Empty text, returning empty translations');
      const response = {
        sourceLanguage: 'auto',
        translations: [
          { lang: 'en', text: '' },
          { lang: 'ja', text: '' },
          { lang: 'th', text: '' }
        ]
      };
      
      translationMonitor.logRequest(Date.now() - startTime, true);
      return NextResponse.json(response);
    }

    // Skip the translation service to avoid recursive loop
    // The translation service calls this same endpoint, creating a loop
    // try {
    //   const translations = await translationService.translate(text, sourceLang);
    //   
    //   // Detect source language if not provided
    //   let detectedLang = sourceLang || 'auto';
    //   if (detectedLang === 'auto') {
    //     const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    //     const isEnglish = /^[A-Za-z0-9\s\-.,!?'"]+$/.test(text);
    //     const isThai = /[\u0E00-\u0E7F]/.test(text);
    //     detectedLang = isJapanese ? 'ja' : isEnglish ? 'en' : isThai ? 'th' : 'other';
    //   }
    //   
    //   const response = {
    //     sourceLanguage: detectedLang,
    //     translations: [
    //       { lang: 'en', text: translations.en || '' },
    //       { lang: 'ja', text: translations.ja || '' },
    //       { lang: 'th', text: translations.th || '' }
    //     ]
    //   };
    //   
    //   translationMonitor.logRequest(Date.now() - startTime, true);
    //   return NextResponse.json(response);
    // } catch (translationError: any) {
    //   console.error('Translation service error:', translationError);
    //   translationMonitor.logRequest(Date.now() - startTime, false, translationError.message);
    //   
    //   // Fallback to original implementation if service fails
    // }
    
    // Check if Gemini API is configured
    console.log('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
    console.log('GEMINI_API_KEY length:', GEMINI_API_KEY?.length);
    console.log('GEMINI_API_KEY first 10 chars:', GEMINI_API_KEY?.substring(0, 10) + '...');
    if (!GEMINI_API_KEY) {
      console.log('No Gemini API key configured, using simple mock translations');
      // Return simple mock translations based on source language
      const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
      const isEnglish = /^[A-Za-z0-9\s\-.,!?'"]+$/.test(text);
      const isThai = /[\u0E00-\u0E7F]/.test(text);
      
      let detectedLang = sourceLang;
      if (sourceLang === 'auto' || !sourceLang) {
        detectedLang = isJapanese ? 'ja' : isEnglish ? 'en' : isThai ? 'th' : 'other';
      }
      
      // Simple mock translations
      const mockTranslations: any = {
        ja: {
          en: "Meeting room",
          ja: text,
          th: "ห้องประชุม"
        },
        en: {
          en: text,
          ja: "会議室",
          th: "ห้องประชุม"
        },
        th: {
          en: "Meeting room",
          ja: "会議室",
          th: text
        }
      };
      
      // If we have predefined mock translation, use it, otherwise return different text for each language
      const translations = mockTranslations[detectedLang] || {
        en: detectedLang === 'en' ? text : `${text} (EN)`,
        ja: detectedLang === 'ja' ? text : `${text} (JA)`,
        th: detectedLang === 'th' ? text : `${text} (TH)`,
      };
      
      return NextResponse.json({
        sourceLanguage: detectedLang,
        translations: [
          { lang: 'en', text: translations.en || detectedLang === 'en' ? text : `${text} (EN)` },
          { lang: 'ja', text: translations.ja || detectedLang === 'ja' ? text : `${text} (JA)` },
          { lang: 'th', text: translations.th || detectedLang === 'th' ? text : `${text} (TH)` }
        ]
      });
    }

    // Retry logic for API calls
    let retries = 3;
    let lastError: any = null;
    
    while (retries > 0) {
      try {
        console.log(`=== Calling Gemini API (attempt ${4 - retries}) ===`);
        
        // Prepare the prompt - escape the text properly to handle special characters
        const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        
        const prompt = `You are a professional translator. Your task is to translate the given text into THREE DIFFERENT languages.

${sourceLang && sourceLang !== 'auto' ? `The source language is: ${sourceLang}` : 'First, detect the language of the input text.'}

CRITICAL TRANSLATION RULES:
1. You MUST provide translations in ALL THREE languages: English, Japanese, and Thai
2. Each translation MUST be different and accurate in its target language
3. If the source text is already in one of these languages, translate it to the other two languages
4. NEVER return the same text for all three languages

IMPORTANT RULES:
1. Return ONLY a valid JSON object with no additional text before or after
2. The JSON must have exactly four keys: 
   - "detectedLang": the detected or specified language code ("en", "ja", "th", or "other")
   - "en": English translation (MUST be in English)
   - "ja": Japanese translation (MUST be in Japanese using appropriate hiragana, katakana, and kanji)
   - "th": Thai translation (MUST be in Thai script)
3. Do not include any markdown formatting, code blocks, or explanations
4. If the text contains product codes or technical terms (like NRT096), keep them as-is in the translation
5. SPECIAL RULE: When you see the exact Japanese character "盤" (U+76E4), translate it as "SWGR" in English and Thai
6. PRESERVE LINE BREAKS: If the input text contains line breaks (\\n), maintain them in all translations

Text to translate: "${escapedText}"

Example 1 - Japanese input "会議室":
{"detectedLang": "ja", "en": "Meeting room", "ja": "会議室", "th": "ห้องประชุม"}

Example 2 - English input "Hello":
{"detectedLang": "en", "en": "Hello", "ja": "こんにちは", "th": "สวัสดี"}

Example 3 - Thai input "สวัสดี":
{"detectedLang": "th", "en": "Hello", "ja": "こんにちは", "th": "สวัสดี"}`;
      
      console.log('Prompt being sent to Gemini:', prompt);
      
      // Call Gemini API for translation - using configuration from working GGMTS project
      const modelName = 'gemini-1.5-flash'; // or 'gemini-1.5-pro' or 'gemini-pro'
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000,
          },
        }),
      });

      if (!response.ok) {
        console.error('Gemini API HTTP error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        
        // Specific error handling based on status code
        if (response.status === 503) {
          console.error('503 Service Unavailable - Gemini API is temporarily down');
          throw new Error(`Gemini API temporarily unavailable (503). This usually indicates the service is overloaded or under maintenance. Please try again in a few minutes.`);
        } else if (response.status === 401) {
          console.error('401 Unauthorized - Invalid API key');
          throw new Error(`Gemini API authentication failed (401). Please check your API key is valid and has proper permissions.`);
        } else if (response.status === 429) {
          console.error('429 Too Many Requests - Rate limit exceeded');
          throw new Error(`Gemini API rate limit exceeded (429). Please wait a moment and try again.`);
        } else if (response.status === 400) {
          console.error('400 Bad Request - Invalid request format');
          throw new Error(`Gemini API bad request (400). The request format may be invalid: ${errorText}`);
        }
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('=== Gemini API Response ===');
      console.log('Full response:', JSON.stringify(result, null, 2));
      
      // Check for API errors
      if (result.error) {
        console.error('Gemini API returned error:', result.error);
        throw new Error(result.error.message || 'Gemini API error');
      }
      
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Generated text from Gemini:', generatedText);
      console.log('Generated text length:', generatedText.length);
      
      if (!generatedText) {
        console.error('No text generated from Gemini API:', result);
        throw new Error('No translation generated');
      }
      
      // Parse the JSON response from Gemini
      let translations = { detectedLang: 'auto', en: text, ja: text, th: text };
      console.log('=== Parsing Translation Response ===');
      
      try {
        // Extract JSON from the response - handle multiline JSON with improved regex
        // This regex looks for a JSON object that starts with { and ends with the matching }
        const jsonMatch = generatedText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        console.log('JSON regex match result:', jsonMatch ? jsonMatch[0] : 'No match');
        
        if (jsonMatch) {
          translations = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed JSON from regex match:', translations);
          
          // Validate the parsed object has required fields
          if (!translations.detectedLang || translations.detectedLang === undefined) {
            console.warn('Missing detectedLang in parsed JSON, setting to "auto"');
            translations.detectedLang = 'auto';
          }
        } else {
          // Try to parse the entire response as JSON
          translations = JSON.parse(generatedText);
          console.log('Successfully parsed entire response as JSON:', translations);
          
          // Validate the parsed object has required fields
          if (!translations.detectedLang || translations.detectedLang === undefined) {
            console.warn('Missing detectedLang in parsed JSON, setting to "auto"');
            translations.detectedLang = 'auto';
          }
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini translation response:', generatedText);
        console.error('Parse error:', parseError);
        
        // Try alternative parsing methods
        try {
          // Remove markdown code blocks if present
          const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          console.log('Cleaned text for parsing:', cleanedText);
          translations = JSON.parse(cleanedText);
          console.log('Successfully parsed cleaned text:', translations);
        } catch (secondError) {
          console.error('Second parse attempt failed:', secondError);
          console.log('Attempting manual extraction from text:', generatedText);
          
          // Last resort: try to extract translations manually
          const detectedMatch = generatedText.match(/"detectedLang"\s*:\s*"([^"]+)"/);
          const enMatch = generatedText.match(/"en"\s*:\s*"([^"]+)"/);
          const jaMatch = generatedText.match(/"ja"\s*:\s*"([^"]+)"/);
          const thMatch = generatedText.match(/"th"\s*:\s*"([^"]+)"/);
          
          console.log('Manual extraction results:', {
            detectedMatch: detectedMatch ? detectedMatch[1] : null,
            enMatch: enMatch ? enMatch[1] : null,
            jaMatch: jaMatch ? jaMatch[1] : null,
            thMatch: thMatch ? thMatch[1] : null
          });
          
          if (enMatch || jaMatch || thMatch) {
            translations = {
              detectedLang: detectedMatch ? detectedMatch[1] : 'auto',
              en: enMatch ? enMatch[1] : text,
              ja: jaMatch ? jaMatch[1] : text,
              th: thMatch ? thMatch[1] : text
            };
            console.log('Manual extraction successful:', translations);
          }
        }
      }

      console.log('=== Final Translation Result ===');
      console.log('Translations object:', translations);
      console.log('Detected language:', translations.detectedLang);
      
      // If the text is Japanese and detectedLang is still 'auto', try to detect it
      if (translations.detectedLang === 'auto' && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
        console.log('Text contains Japanese characters but detectedLang is auto, setting to "ja"');
        translations.detectedLang = 'ja';
      }
      
      // Ensure we have valid translations for all languages
      const enTranslation = translations.en || (translations.detectedLang === 'en' ? text : '[Translation Error]');
      const thTranslation = translations.th || (translations.detectedLang === 'th' ? text : '[Translation Error]');
      
      // Format response to match client expectations
      const finalResponse = {
        sourceLanguage: translations.detectedLang || 'auto',
        translations: [
          { lang: 'en', text: enTranslation },
          { lang: 'ja', text: translations.ja || (translations.detectedLang === 'ja' ? text : '[Translation Error]') },
          { lang: 'th', text: thTranslation }
        ]
      };
      
      console.log('Final API response:', finalResponse);
      console.log('Final response JSON:', JSON.stringify(finalResponse, null, 2));
      
      translationMonitor.logRequest(Date.now() - startTime, true);
      return NextResponse.json(finalResponse);
        } catch (apiError: any) {
        console.error('=== Gemini API Error ===');
        console.error('Error details:', apiError);
        console.error('Error message:', apiError.message);
        console.error('Error stack:', apiError.stack);
      
        // Check if text is Japanese for better fallback
        const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
        const detectedLang = isJapanese ? 'ja' : 'en';
        
        // Return fallback response
        const fallbackResponse = {
          sourceLanguage: detectedLang,
          translations: [
            { lang: 'en', text: detectedLang === 'en' ? text : `[API Error] ${text}` },
            { lang: 'ja', text: detectedLang === 'ja' ? text : `[API Error] ${text}` },
            { lang: 'th', text: `[API Error] ${text}` }
          ]
        };
        
        console.log('Returning fallback response:', fallbackResponse);
        
        translationMonitor.logRequest(Date.now() - startTime, false, apiError.message);
        return NextResponse.json(fallbackResponse);
      }
    }
  } catch (error: any) {
    console.error('Error translating text:', error);
    translationMonitor.logRequest(Date.now() - startTime, false, error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to translate text' },
      { status: 500 }
    );
  }
}