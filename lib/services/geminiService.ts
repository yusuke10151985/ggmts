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

  // タイ語の特別指示（GPTと同じ）
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

  if (mode === 'translate') {
    return `${sourceLanguageInstruction}

Please translate the following text to ${targetLanguagesString}:

Text: "${text}"

${specialInstructions}

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

Use only Arabic numerals (1, 2, 3, ...) for all numbers and numbering. Do NOT use any language-specific digits. Use only English units (m, kg, etc.) for all measurements. Do NOT use any language-specific units.
Ensure the response is valid JSON and includes all requested target languages.`;
  } else {
    const basePrompt = `You are an expert summarizer. Carefully analyze the following text and create a multi-level numbered summary as a JSON array.

Instructions:
- Divide the text into items based on topics and contents.
- Create a multi-level numbered structure, using format like:
  1.
    1.1
      1.1.1
  2.
    2.1
      2.1.1
- Use only Arabic numerals (1, 2, 3, ...) for all numbers and numbering. Do NOT use any language-specific digits.
- Use only English units (m, kg, etc.) for all measurements. Do NOT use any language-specific units.
- Do NOT include any greetings, closings, or irrelevant sentences.
- Each item must be short and focused.
- If you cannot create a multi-level numbered summary, respond with an error message in the summary array.

${specialInstructions}

Respond ONLY with a JSON object in this format:
{
  "sourceLanguage": "${sourceLang}",
  "translations": [
    {
      "lang": "${targetLangs[0]}",
      "text": "...",
      "summary": [
        "1. ...",
        "1.1 ...",
        "2. ..."
      ]
    }
  ]
}

Do NOT include any text or explanation outside the JSON object. The summary array MUST be present and contain a multi-level numbered list.`;

    return basePrompt;
  }
};

export const getTranslations = async (
  text: string,
  sourceLang: string,
  targetLangs: string[],
  mode: TranslationMode,
  model?: string
): Promise<TranslationResult> => {
  try {
    const modelName = model || 'gemini-1.5-flash';
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
      const englishResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
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
      const translateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
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

    // summary配列の自動補完: summaryが空/未定義ならtextを行分割してsummary配列に
    if (parsedResponse && Array.isArray(parsedResponse.translations)) {
      parsedResponse.translations = parsedResponse.translations.map((t: any) => {
        if (!t.summary || t.summary.length === 0) {
          const lines = (t.text || '').split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
          // 番号付きリスト形式の行のみ抽出（なければ全行）
          const numbered = lines.filter((line: string) => /^[0-9]+(\.[0-9]+)*[\.、．] /.test(line) || /^[0-9]+(\.[0-9]+)*[\.、．]/.test(line));
          return { ...t, summary: numbered.length > 0 ? numbered : lines };
        }
        return t;
      });
    }

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