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

For each translation, create a concise summary of the content in that same language. The summary MUST be a numbered list that can be nested (e.g., "1.", "1.1.", "2."). Omit any conversational filler like greetings or pleasantries from the summary. Focus only on the core points.

Please respond with a JSON object in this exact format:
{
  "sourceLanguage": "detected_or_specified_lang_code",
  "translations": [
    {
      "lang": "target_lang_code",
      "text": "summarized_text (as a nested, numbered list)"
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
    
    const prompt = getPrompt(text, sourceLang, targetLangs, mode);
    
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

    return {
      sourceLanguage: parsedResponse.sourceLanguage,
      translations: parsedResponse.translations
    };

  } catch (error) {
    console.error('Error fetching or parsing translations:', error);
    throw new Error(`Failed to get translations from Gemini API. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 