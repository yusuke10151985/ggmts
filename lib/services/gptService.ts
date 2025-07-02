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
    ? `Please analyze the following long text.\n\n1. Divide the text into items based on topics and contents.\n2. Create a multi-level numbered structure, using format like:\n   1.\n     1.1\n       1.1.1\n   2.\n     2.1\n       2.1.1\n... according to major, medium, and minor categories.\n\n3. Completely remove any sentences that are greetings, closings, or irrelevant to the main content.\n\nStrict instructions:\n- Do NOT include any greetings like "Hello", "Thank you", or closing statements.\n- Always format using numbers: 1, 1.1, 1.1.1, etc.\n- If some parts do not fit, omit them. Only meaningful content should remain.\n- Keep each item short and focused.\n\nRespond ONLY with a JSON object in this format:\n{\n  "sourceLanguage": "...",\n  "translations": [\n    {\n      "lang": "...",\n      "text": "...",\n      "summary": [\n        "1. ...",\n        "1.1 ...",\n        "2. ..."\n      ]\n    }\n  ]\n}`
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
    console.log('📝 GPT raw response text:', responseText);
    // Clean potential markdown fences
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/;
    const match = responseText.match(fenceRegex);
    const jsonText = match && match[1] ? match[1].trim() : responseText;
    console.log('🧹 Cleaned JSON text:', jsonText);
    const parsedData = JSON.parse(jsonText);
    console.log('✅ Parsed OpenAI data:', parsedData);

    // summary_markdownがあればsummary配列に変換
    if (parsedData && parsedData.summary_markdown && (!parsedData.summary || parsedData.summary.length === 0)) {
      parsedData.summary = parsedData.summary_markdown.split(/\r?\n/).filter((line: string) => line.trim());
    }

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