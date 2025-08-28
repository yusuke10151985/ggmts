import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key from environment variable
const API_KEY = process.env.GEMINI_API_KEY || "";

console.log("[GeminiService] API key exists:", !!API_KEY);
console.log("[GeminiService] API key length:", API_KEY?.length || 0);

if (!API_KEY) {
    console.error("Gemini API key not found. Please set GEMINI_API_KEY in your .env.local file.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface TranslationResult {
  japanese: string;
  english: string;
  thai: string;
  japaneseReading?: string;
  thaiReading?: string;
}

export interface ReadingResult {
  hiragana?: string;
  romaji?: string;
  romanized?: string;
  katakana?: string;
}

export enum SourceLanguage {
  JP = 'japanese',
  EN = 'english', 
  TH = 'thai'
}

/**
 * Detects the language of a given text string.
 */
export const detectLanguage = async (query: string): Promise<SourceLanguage | null> => {
  if (!query.trim()) {
    return null;
  }

  try {
    const prompt = `
      Identify the language of the following text.
      The text is: "${query}"
      Respond with ONLY one of the following words: 'japanese', 'english', or 'thai'.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const generateResult = await model.generateContent(prompt);
    const response = await generateResult.response;

    const text = response.text().toLowerCase().trim();

    if (text.includes('japanese')) {
      return SourceLanguage.JP;
    }
    if (text.includes('english')) {
      return SourceLanguage.EN;
    }
    if (text.includes('thai')) {
      return SourceLanguage.TH;
    }
    
    return null;
  } catch (error) {
    console.error("Error detecting language:", error);
    return null;
  }
};

/**
 * Translates factory/industrial terms between Japanese, English, and Thai.
 */
export const translateFactoryTerm = async (
  text: string,
  sourceLanguage: SourceLanguage,
  context?: string
): Promise<TranslationResult | null> => {
  console.log("[GeminiService] translateFactoryTerm called:", { text, sourceLanguage, context });
  
  if (!text.trim()) {
    console.log("[GeminiService] Text is empty, returning null");
    return null;
  }

  try {
    console.log("[GeminiService] Starting translation...");
    const contextInfo = context ? `Context: ${context}. ` : '';
    const prompt = `
      You are a professional translator specializing in factory and industrial terminology.
      ${contextInfo}
      
      Translate the following ${sourceLanguage === SourceLanguage.JP ? 'Japanese' : sourceLanguage === SourceLanguage.EN ? 'English' : 'Thai'} factory/industrial term into all three languages.
      The term is: "${text}"
      
      Provide the translation in the following JSON format:
      {
        "japanese": "日本語の用語",
        "english": "English term",
        "thai": "คำศัพท์ภาษาไทย",
        "japaneseReading": "にほんごのようご",
        "thaiReading": "Kam sap paa-saa thai"
      }
      
      Important:
      1. Use appropriate technical/industrial terminology
      2. For Japanese reading, provide hiragana
      3. For Thai reading, provide romanization
      4. Make sure the translations are commonly used in factory/industrial contexts
      5. Return ONLY the JSON object, no additional text
    `;

    console.log("[GeminiService] Creating model and generating content...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const generateResult = await model.generateContent(prompt);
    const response = await generateResult.response;

    console.log("[GeminiService] Got response from Gemini");
    const text_response = response.text().trim();
    console.log("[GeminiService] Response text:", text_response);
    
    // Extract JSON from the response
    const jsonMatch = text_response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[GeminiService] No JSON found in response:", text_response);
      throw new Error('No JSON found in response');
    }

    console.log("[GeminiService] Extracted JSON:", jsonMatch[0]);
    const translationResult = JSON.parse(jsonMatch[0]);
    console.log("[GeminiService] Parsed result:", translationResult);
    return translationResult;
  } catch (error: any) {
    console.error("[GeminiService] Error translating term:", error);
    console.error("[GeminiService] Error message:", error.message);
    console.error("[GeminiService] Error stack:", error.stack);
    if (error.response) {
      console.error("[GeminiService] Error response:", error.response);
    }
    return null;
  }
};

/**
 * Generates reading (pronunciation guide) for Japanese or Thai text
 */
export const generateReading = async (
  text: string,
  language: 'japanese' | 'thai'
): Promise<ReadingResult | null> => {
  if (!text.trim()) {
    return null;
  }

  try {
    const prompt = language === 'japanese'
      ? `Convert the following Japanese text to hiragana and romaji readings: "${text}". Return as JSON: {"hiragana": "ひらがな", "romaji": "romaji"}. Return ONLY the JSON, nothing else.`
      : `Convert the following Thai text to romanized reading and katakana approximation: "${text}". Return as JSON: {"romanized": "romanization", "katakana": "カタカナ"}. Return ONLY the JSON, nothing else.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const generateResult = await model.generateContent(prompt);
    const response = await generateResult.response;

    const text_response = response.text().trim();
    const jsonMatch = text_response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error generating reading:", error);
    return null;
  }
};

/**
 * Suggests related factory terms based on input
 */
export const suggestRelatedTerms = async (
  term: string,
  language: SourceLanguage
): Promise<string[] | null> => {
  if (!term.trim()) {
    return null;
  }

  try {
    const prompt = `
      Given the factory/industrial term "${term}" in ${language === SourceLanguage.JP ? 'Japanese' : language === SourceLanguage.EN ? 'English' : 'Thai'},
      suggest 5 related terms commonly used in factory or industrial settings.
      
      Return the suggestions as a JSON array of strings in the same language.
      Example: ["term1", "term2", "term3", "term4", "term5"]
      
      Return ONLY the JSON array, no additional text.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const generateResult = await model.generateContent(prompt);
    const response = await generateResult.response;

    const text = response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error suggesting related terms:", error);
    return null;
  }
};

/**
 * Generate contextual description for a factory term
 */
export const generateTermDescription = async (
  term: string,
  language: SourceLanguage,
  category?: string
): Promise<string | null> => {
  if (!term.trim()) {
    return null;
  }

  try {
    const categoryInfo = category ? ` in the ${category} category` : '';
    const prompt = `
      Generate a brief, professional description for the factory/industrial term "${term}"${categoryInfo}.
      The description should be in ${language === SourceLanguage.JP ? 'Japanese' : language === SourceLanguage.EN ? 'English' : 'Thai'}.
      Keep it concise (1-2 sentences) and focused on industrial/factory context.
      Return only the description text, no additional formatting.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const generateResult = await model.generateContent(prompt);
    const response = await generateResult.response;

    return response.text().trim();
  } catch (error) {
    console.error("Error generating description:", error);
    return null;
  }
};