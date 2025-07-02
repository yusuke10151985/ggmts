import { TranslationResult, TranslationMode } from '../types';

// Enhanced environment variable handling
const getOpenAIKey = (): string => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    console.log("✅ Using OPENAI_API_KEY for OpenAI API calls");
    return openaiKey;
  }

  console.error("❌ OPENAI_API_KEY environment variable is not set");
  throw new Error("OPENAI_API_KEY environment variable is not set");
};

const OPENAI_API_KEY = getOpenAIKey();

const getPrompt = (text: string, sourceLang: string, targetLangs: string[], mode: TranslationMode): string => {
  const sourceLanguageInstruction = sourceLang === 'auto'
    ? 'First, automatically detect the language of the following text.'
    : `The source language is ${sourceLang}.`;

  const targetLanguagesString = targetLangs.join(', ');

  const modeInstruction = mode === 'summarize'
    ? `Your task is to first translate the text into the specified languages, and then for each translation, create a concise summary of the content in that same language. The summary MUST be written as a single paragraph without line breaks, bullet points, or numbered lists. Include all content including greetings, pleasantries, and any other text. Do not omit anything from the original text.`
    : 'Your task is to translate the given text into several specified languages.';

  let specialInstructions = '';
  if (targetLangs.includes('th')) {
    specialInstructions = `
SPECIAL INSTRUCTIONS FOR THAI:
For the Thai translation, where gender affects pronouns (like 'ผม'/'ฉัน') and politeness particles ('ครับ'/'ค่ะ'), you MUST merge them with a slash.
Example: 'ผม/ฉัน ไปโรงเรียน ครับ/ค่ะ'.
Do NOT create two separate full sentences for male and female speakers. Only merge the specific words that differ.
This rule applies to both full translations and summaries.
`;
  }

  return `
You are an expert multilingual translator and summarizer.
${modeInstruction}
${sourceLanguageInstruction}
${specialInstructions}
The target languages for processing are: ${targetLanguagesString}.

The text to process is:
---
${text}
---

Provide the response as a single, valid JSON object. Do not use markdown formatting like \`\`\`json.
The JSON object must follow this exact structure:
{
  "sourceLanguage": "The auto-detected BCP-47 language code (e.g., 'en', 'es')",
  "translations": [
    {
      "lang": "target_language_code_1",
      "text": "translated_text_1",
      "summary": [ ...outline array as above, only for summarize mode... ]
    }
  ]
}

The "translations" array must contain one object for each target language requested: ${targetLanguagesString}.
The "lang" value in each translation object must exactly match one of the requested BCP-47 target language codes.
Ensure the entire output is a single raw JSON object without any additional text or formatting before or after it.
`;
};

export const getTranslations = async (
  text: string,
  sourceLang: string,
  targetLangs: string[],
  mode: TranslationMode
): Promise<TranslationResult> => {
  if (!text.trim()) {
    return { sourceLanguage: 'auto', translations: [] };
  }

  console.log('🔍 OpenAI service called with:', {
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    sourceLang,
    targetLangs,
    mode
  });

  const prompt = getPrompt(text, sourceLang, targetLangs, mode);
  
  try {
    console.log('🚀 Making OpenAI API request with model: gpt-4o-mini');
    console.log('🔑 API Key (first 10 chars):', OPENAI_API_KEY.substring(0, 10) + '...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator and summarizer. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    console.log('📊 OpenAI API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error response:', errorText);
      
      if (response.status === 401) {
        throw new Error(`OpenAI API authentication failed. Please check your API key. Status: ${response.status}`);
      }
      
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📋 OpenAI API response data structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasMessage: !!data.choices?.[0]?.message
    });
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const responseText = data.choices[0].message.content.trim();
    console.log('📝 OpenAI API response text (first 200 chars):', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    // Clean potential markdown fences
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/;
    const match = responseText.match(fenceRegex);
    const jsonText = match && match[1] ? match[1].trim() : responseText;
    
    console.log('🧹 Cleaned JSON text (first 200 chars):', jsonText.substring(0, 200) + (jsonText.length > 200 ? '...' : ''));
    
    const parsedData = JSON.parse(jsonText);
    console.log('✅ Parsed OpenAI data:', parsedData);

    if (parsedData && Array.isArray(parsedData.translations)) {
      return parsedData as TranslationResult;
    } else {
      throw new Error("Invalid JSON structure received from API.");
    }
  } catch (error) {
    console.error("❌ Error fetching or parsing translations from OpenAI:", error);
    let errorMessage = "Failed to get translations from OpenAI API. ";
    if (error instanceof SyntaxError) {
      errorMessage += "The response was not valid JSON. Please try again.";
    } else if (error instanceof Error) {
      errorMessage += error.message;
    } else {
      errorMessage += "An unknown error occurred."
    }
    throw new Error(errorMessage);
  }
}; 