import { GoogleGenAI } from "@google/genai";
import { TranslationResult, TranslationMode } from '../types';

// Check if API key is available
if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set");
    throw new Error("GEMINI_API_KEY environment variable is not set");
}

// Initialize Gemini with error handling
let ai: GoogleGenAI;
try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Gemini client initialized successfully');
} catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    throw new Error('Failed to initialize Gemini client');
}

const getPrompt = (text: string, sourceLang: string, targetLangs: string[], mode: TranslationMode): string => {
  const sourceLanguageInstruction = sourceLang === 'auto'
    ? 'First, automatically detect the language of the following text.'
    : `The source language is ${sourceLang}.`;

  const targetLanguagesString = targetLangs.join(', ');

  const modeInstruction = mode === 'summarize'
    ? 'Your task is to first translate the text into the specified languages, and then for each translation, create a concise summary of the content in that same language. The summary MUST be a numbered list that can be nested (e.g., "1.", "1.1.", "2."). Omit any conversational filler like greetings or pleasantries from the summary. Focus only on the core points.'
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
      "text": "translated_text_1 (or translated and summarized text as a nested, numbered list)"
    }
  ]
}

The "translations" array must contain one object for each target language requested: ${targetLanguagesString}.
The "lang" value in each translation object must exactly match one of the requested BCP-47 target language codes.
Ensure the entire output is a single raw JSON object without any additional text or formatting before or after it.
`;
};

export const getTranslations = async (text: string, sourceLang: string, targetLangs: string[], mode: TranslationMode): Promise<TranslationResult> => {
  if (!text.trim()) {
    return { sourceLanguage: 'auto', translations: [] };
  }

  console.log('Gemini service called with:', {
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    sourceLang,
    targetLangs,
    mode
  })

  const prompt = getPrompt(text, sourceLang, targetLangs, mode);
  
  try {
    console.log('Making Gemini API request...')
    
    // Use a more stable model and configuration
    const model = ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
            temperature: 0.2,
            maxOutputTokens: 2048,
        },
    });

    console.log('Gemini API request sent, waiting for response...')
    const response = await model;
    console.log('Gemini API response received')

    if (!response || !response.text) {
        throw new Error("No response text received from Gemini API");
    }

    let jsonText = response.text.trim();
    console.log('Raw Gemini response:', jsonText.substring(0, 200) + (jsonText.length > 200 ? '...' : ''))
    
    // Clean potential markdown fences, as per Gemini best practices.
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/;
    const match = jsonText.match(fenceRegex);
    if (match && match[1]) {
        jsonText = match[1].trim();
        console.log('Cleaned JSON text:', jsonText.substring(0, 200) + (jsonText.length > 200 ? '...' : ''))
    }
    
    const parsedData = JSON.parse(jsonText);
    console.log('Parsed Gemini data:', parsedData)

    if (parsedData && Array.isArray(parsedData.translations)) {
        return parsedData as TranslationResult;
    } else {
        throw new Error("Invalid JSON structure received from API.");
    }
  } catch (error) {
    console.error("Error fetching or parsing translations:", error);
    let errorMessage = "Failed to get translations from Gemini API. ";
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