import { TranslationResult, TranslationMode } from '../types';

// Enhanced environment variable handling - ONLY use GEMINI_API_KEY
const getApiKey = (): string => {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log("✅ Using GEMINI_API_KEY for Gemini API calls");
    return geminiKey;
  }

  console.error("❌ GEMINI_API_KEY environment variable is not set");
  throw new Error("GEMINI_API_KEY environment variable is not set. Please set it in your .env.local file");
};

const GEMINI_API_KEY = getApiKey();

const getPrompt = (text: string, sourceLang: string, targetLangs: string[], mode: TranslationMode): string => {
  const sourceLanguageInstruction = sourceLang === 'auto'
    ? 'First, automatically detect the language of the following text.'
    : `The source language is ${sourceLang}.`;

  const targetLanguagesString = targetLangs.join(', ');

  if (mode === 'translate') {
    return `${sourceLanguageInstruction}

Please translate the following text to ${targetLanguagesString}:

Text: "${text}"

Please respond with a JSON object in this exact format:
{
  "sourceLanguage": "detected_or_specified_lang_code",
  "translations": [
    {
      "lang": "target_lang_code",
      "text": "translated_text"
    }
  ]
}

Ensure the response is valid JSON and includes all requested target languages.`;
  } else {
    return `${sourceLanguageInstruction}

Please summarize the following text in ${targetLanguagesString}:

Text: "${text}"

For each translation, create a concise summary of the content in that same language. The summary MUST be written as a single paragraph without line breaks, bullet points, or numbered lists. Include all content including greetings, pleasantries, and any other text. Do not omit anything from the original text.

IMPORTANT: For each target language, you MUST write the summary in that language. Do NOT answer in Japanese or any language other than the target language. If the target language is Thai, the summary must be in Thai. If the target language is Indonesian, the summary must be in Indonesian. Never answer in Japanese unless Japanese is the target language.

Please respond with a JSON object in this exact format:
{
  "sourceLanguage": "detected_or_specified_lang_code",
  "translations": [
    {
      "lang": "target_lang_code",
      "text": "summarized_text (as a single paragraph without line breaks, bullet points, or numbered lists)"
    }
  ]
}

Ensure the response is valid JSON and includes all requested target languages.`;
  }
};

export const getTranslations = async (
  text: string,
  sourceLang: string,
  targetLangs: string[],
  mode: TranslationMode
): Promise<TranslationResult> => {
  try {
    console.log('Making Gemini API request...');
    
    // Gemini workaround: If only one of ['th', 'ms', 'vi', 'my'] is requested, add 'en' to the request
    const problematicLangs = ['th', 'ms', 'vi', 'my'];
    let actualTargetLangs = targetLangs;
    let filterTo: string[] = targetLangs;
    if (targetLangs.length === 1 && problematicLangs.includes(targetLangs[0])) {
      actualTargetLangs = [targetLangs[0], 'en'];
      console.log('Gemini workaround: Adding en to targetLangs for', targetLangs[0]);
    }

    // --- Pivot要約: summarize in English first, then translate summary ---
    if (mode === 'summarize' && sourceLang !== 'en' && !targetLangs.includes('en')) {
      // 1. Summarize in English
      const englishPrompt = getPrompt(text, sourceLang, ['en'], 'summarize');
      const englishResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: englishPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });
      if (!englishResponse.ok) {
        const errorData = await englishResponse.json();
        throw new Error(`Gemini API (pivot English) failed: ${englishResponse.status} ${englishResponse.statusText} ${JSON.stringify(errorData)}`);
      }
      const englishData = await englishResponse.json();
      let englishText = englishData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (englishText.startsWith('```')) {
        englishText = englishText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
      }
      const englishSummary = JSON.parse(englishText);
      const englishSummaryText = englishSummary.translations?.[0]?.text || '';
      // 2. Translate English summary to each target language
      const translatePrompt = `Translate the following summary into these languages: ${targetLangs.join(', ')}\n\nSummary:\n${englishSummaryText}\n\nRespond in this JSON format:\n{\n  "translations": [\n    { "lang": "target_lang_code", "text": "translated_summary" }\n  ]\n}`;
      const translateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: translatePrompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });
      if (!translateResponse.ok) {
        const errorData = await translateResponse.json();
        throw new Error(`Gemini API (pivot translate) failed: ${translateResponse.status} ${translateResponse.statusText} ${JSON.stringify(errorData)}`);
      }
      const translateData = await translateResponse.json();
      let translateText = translateData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (translateText.startsWith('```')) {
        translateText = translateText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
      }
      const translated = JSON.parse(translateText);
      return {
        sourceLanguage: englishSummary.sourceLanguage || 'en',
        translations: translated.translations.filter((t: any) => targetLangs.includes(t.lang)),
      };
    }
    // --- End Pivot要約 ---

    const prompt = getPrompt(text, sourceLang, actualTargetLangs, mode);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    console.log('Gemini API response received');
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('Gemini API error response:', JSON.stringify(errorData, null, 2));
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Gemini API success response:', JSON.stringify(data, null, 2));

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log('Gemini API response text:', responseText);

    // Strip code block markers if present
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```')) {
      // Remove opening ```json or ``` and closing ```
      cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }
    console.log('Cleaned text for JSON parsing:', cleanText);
    const parsedResponse = JSON.parse(cleanText);
    console.log('Parsed JSON response:', JSON.stringify(parsedResponse, null, 2));

    // Gemini workaround: Only return the originally requested language(s)
    let filteredTranslations = parsedResponse.translations;
    if (actualTargetLangs.length !== filterTo.length) {
      filteredTranslations = parsedResponse.translations.filter((t: any) => filterTo.includes(t.lang));
    }

    return {
      sourceLanguage: parsedResponse.sourceLanguage,
      translations: filteredTranslations
    };

  } catch (error) {
    console.error('Error fetching or parsing translations:', error);
    throw new Error(`Failed to get translations from Gemini API. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 