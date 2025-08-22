import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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
      return NextResponse.json({
        success: true,
        data: { en: '', ja: '', th: '' },
        detectedLanguage: 'auto',
      });
    }

    // Check if Gemini API is configured
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    console.log('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
    console.log('GEMINI_API_KEY length:', GEMINI_API_KEY?.length);
    console.log('GEMINI_API_KEY first 10 chars:', GEMINI_API_KEY?.substring(0, 10) + '...');
    if (!GEMINI_API_KEY) {
      console.log('No Gemini API key configured, returning mock translations');
      // Return mock translations with proper language detection
      const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
      const isEnglish = /^[A-Za-z0-9\s\-.,!?'"]+$/.test(text);
      const detectedLang: string = isJapanese ? 'ja' : isEnglish ? 'en' : 'other';
      
      return NextResponse.json({
        success: true,
        data: {
          en: detectedLang === 'en' ? text : `[Mock EN] ${text}`,
          ja: detectedLang === 'ja' ? text : `[Mock JA] ${text}`,
          th: detectedLang === 'th' ? text : `[Mock TH] ${text}`,
        },
        detectedLanguage: detectedLang,
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
        
        const prompt = `You are a translator. Analyze the input text and translate it appropriately.
              
              ${sourceLang && sourceLang !== 'auto' ? `The source language is: ${sourceLang}` : 'First, detect the language of the input text.'}
              
              Then translate the text to all three languages (English, Japanese, and Thai).
              For the source language, return the original text unchanged.
              
              Important rules:
              1. Return ONLY a valid JSON object with no additional text before or after
              2. The JSON must have exactly four keys: 
                 - "detectedLang": the detected or specified language code ("en", "ja", "th", or "other")
                 - "en": English translation
                 - "ja": Japanese translation (use hiragana, katakana, and kanji as appropriate)
                 - "th": Thai translation
              3. Do not include any markdown formatting, code blocks, or explanations
              4. If the text contains product codes or technical terms (like NRT096), keep them as-is in the translation
              5. For the original language, return the original text unchanged
              6. Ensure proper handling of Japanese characters (hiragana, katakana, kanji)
              7. IMPORTANT: When translating the Japanese character "盤" (panel/board), always translate it as "SWGR" in both English and Thai
              8. PRESERVE LINE BREAKS: If the input text contains line breaks (\\n), maintain them in the same positions in all translations
              
              Text to translate: "${escapedText}"
              
              Example response for Japanese input "テスト":
              {"detectedLang": "ja", "en": "test", "ja": "テスト", "th": "ทดสอบ"}`;
      
      console.log('Prompt being sent to Gemini:', prompt);
      
      // Call Gemini API for translation - using configuration from working GGMTS project
      const modelName = 'gemini-1.5-flash'; // or 'gemini-1.5-pro' or 'gemini-pro'
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
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
      let enTranslation = translations.en || (translations.detectedLang === 'en' ? text : '[Translation Error]');
      let thTranslation = translations.th || (translations.detectedLang === 'th' ? text : '[Translation Error]');
      
      // **CUSTOM TRANSLATION**: Replace "盤" with "SWGR" in English and Thai translations
      // This ensures electrical panel terminology is consistent
      if (text.includes('盤')) {
        console.log('Found "盤" in original text, replacing with "SWGR" in EN and TH translations');
        // Replace common translations of 盤 with SWGR
        enTranslation = enTranslation.replace(/\bpanel\b/gi, 'SWGR')
                                     .replace(/\bboard\b/gi, 'SWGR')
                                     .replace(/\bswitchboard\b/gi, 'SWGR')
                                     .replace(/\bswitchgear\b/gi, 'SWGR');
        thTranslation = thTranslation.replace(/แผง/g, 'SWGR')
                                     .replace(/ตู้/g, 'SWGR')
                                     .replace(/บอร์ด/g, 'SWGR');
      }
      
      const finalResponse = {
        success: true,
        data: {
          en: enTranslation,
          ja: translations.ja || (translations.detectedLang === 'ja' ? text : '[Translation Error]'),
          th: thTranslation,
        },
        detectedLanguage: translations.detectedLang || 'auto',
      };
      
      console.log('Final API response:', finalResponse);
      console.log('Final response JSON:', JSON.stringify(finalResponse, null, 2));
      
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
          success: true,
          data: {
            en: detectedLang === 'en' ? text : `[API Error] ${text}`,
            ja: detectedLang === 'ja' ? text : `[API Error] ${text}`,
            th: `[API Error] ${text}`,
          },
          detectedLanguage: detectedLang,
        };
        
        console.log('Returning fallback response:', fallbackResponse);
        
        return NextResponse.json(fallbackResponse);
      }
    }
  } catch (error) {
    console.error('Error translating text:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to translate text' },
      { status: 500 }
    );
  }
}