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

  const modeInstruction = mode === 'summarize'
    ? `Summarize the following text as a multi-level numbered list.\n\nInstructions:\n- Divide the text into items based on topics and contents.\n- Use a multi-level numbered structure (1., 1.1, 1.1.1, 2., 2.1, etc).\n- Use only Arabic numerals (1, 2, 3, ...) for all numbers and numbering. Do NOT use any language-specific digits.\n- Use only English units (m, kg, etc.) for all measurements. Do NOT use any language-specific units.\n- Do NOT include any greetings, closings, or irrelevant sentences.\n- Each item must be short and focused.\n\nRespond ONLY with a JSON object in this format:\n{\n  "sourceLanguage": "...",\n  "translations": [\n    {\n      "lang": "...",\n      "text": "...",\n      "summary": [\n        "1. ...",\n        "1.1 ...",\n        "2. ..."\n      ]\n    }\n  ]\n}\n\nThe summary array MUST be present and contain a multi-level numbered list. Do NOT include any text or explanation outside the JSON object.`
    : 'Your task is to translate the given text into several specified languages. Use only Arabic numerals (1, 2, 3, ...) for all numbers and numbering. Use only English units (m, kg, etc.) for all measurements. Do NOT use any language-specific digits or units.';

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
  mode: TranslationMode,
  model?: string
): Promise<TranslationResult> => {
  if (!text.trim()) {
    return { sourceLanguage: 'auto', translations: [] };
  }
  
  console.log('🔍 Gemini service called with:', {
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    sourceLang,
    targetLangs,
    mode,
    model
  });

  try {
    const modelName = model || 'gemini-1.5-flash';
    console.log('🚀 Making Gemini API request with model:', modelName);
    console.log('🔑 API Key (first 10 chars):', GEMINI_API_KEY.substring(0, 10) + '...');
    
    // Gemini workaround: If only one of ['th', 'ms', 'vi', 'my'] is requested, add 'en' to the request
    const problematicLangs = ['th', 'ms', 'vi', 'my'];
    let actualTargetLangs = targetLangs;
    let filterTo: string[] = targetLangs;
    if (targetLangs.length === 1 && problematicLangs.includes(targetLangs[0])) {
      actualTargetLangs = [targetLangs[0], 'en'];
      console.log('Gemini workaround: Adding en to targetLangs for', targetLangs[0]);
    }

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
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2000,
        }
      })
    });

    console.log('📊 Gemini API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error response:', errorText);
      
      if (response.status === 401) {
        throw new Error(`Gemini API authentication failed. Please check your API key. Status: ${response.status}`);
      }
      
      throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📋 Gemini API response data:', JSON.stringify(data, null, 2));
    console.log('📋 Gemini API response data structure:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length || 0,
      hasContent: !!data.candidates?.[0]?.content
    });

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log('📝 Gemini raw response text:', responseText);

    // Clean potential markdown fences and extract JSON - enhanced version
    let cleanText = responseText.trim();
    
    // Step 1: Remove markdown code blocks with multiline support
    const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
    const match = cleanText.match(fenceRegex);
    if (match && match[1]) {
      cleanText = match[1].trim();
    } else {
      // Fallback: remove starting and ending code block markers
      cleanText = cleanText
        .replace(/^```(?:json)?\s*\n?/i, '')  // Remove opening fence
        .replace(/\n?\s*```\s*$/i, '')        // Remove closing fence
        .trim();
    }
    
    // Step 2: Extract JSON object from mixed content (find first { to last })
    const jsonStartIndex = cleanText.indexOf('{');
    const jsonEndIndex = cleanText.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      cleanText = cleanText.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    // Step 3: Additional cleanup for common issues
    cleanText = cleanText
      .replace(/^[^{]*{/, '{')  // Remove anything before first {
      .replace(/}[^}]*$/, '}')  // Remove anything after last }
      .trim();
    
    console.log('🧹 Cleaned JSON text length:', cleanText.length);
    console.log('🧹 First 200 chars:', cleanText.substring(0, 200));
    console.log('🧹 Last 200 chars:', cleanText.substring(Math.max(0, cleanText.length - 200)));
    
    // Enhanced JSON parsing with validation and recovery
    let parsedData;
    try {
      parsedData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ Initial JSON parsing failed, attempting comprehensive repair...');
      console.error('❌ JSON parsing failed:', parseError);
      console.error('❌ Error position:', (parseError as any).message);
      
      // Try to fix common JSON issues with enhanced patterns
      let fixedText = cleanText;
      
      // Enhanced comma fixing - multiple patterns for different cases
      
      // 1a. Fix missing commas between quoted strings (with or without newlines)
      fixedText = fixedText.replace(/("[\s\S]*?")(\s*\n?\s*)("[\s\S]*?")/g, '$1,$2$3');
      
      // 1b. Fix missing commas between array elements (objects/strings)
      fixedText = fixedText.replace(/([\}\]"])(\s*\n?\s*)([\[\{"])/g, '$1,$2$3');
      
      // 1c. Fix missing commas in summary arrays specifically
      fixedText = fixedText.replace(/("summary":\s*\[[\s\S]*?)("[\s\S]*?")(\s+)("[\s\S]*?")/g, '$1$2,$3$4');
      
      // 1d. Fix pattern: "text"\n"text" -> "text",\n"text"
      fixedText = fixedText.replace(/("[\s\S]*?")\s*[\r\n]+\s*("[\s\S]*?")/g, '$1,\n$2');
      
      // 2. Fix trailing commas before closing brackets
      fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1');
      
      // 3. Fix double commas
      fixedText = fixedText.replace(/,,+/g, ',');
      
      // 3. Fix incomplete arrays by closing them
      const openBrackets = (fixedText.match(/\[/g) || []).length;
      const closeBrackets = (fixedText.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedText += ']';
        }
      }
      
      // 4. Fix incomplete objects by closing them
      const openBraces = (fixedText.match(/\{/g) || []).length;
      const closeBraces = (fixedText.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedText += '}';
        }
      }
      
      console.log('🔧 Attempting to fix JSON...');
      console.log('🔧 Original text length:', cleanText.length);
      console.log('🔧 Fixed text length:', fixedText.length);
      
      // Extract error position from error message and show problematic area
      const errorMessage = (parseError as any).message;
      const positionMatch = errorMessage.match(/position (\d+)/);
      const errorPos = positionMatch ? parseInt(positionMatch[1]) : 3915;
      
      console.log('🔧 Detected error position:', errorPos);
      
      if (cleanText.length > errorPos) {
        const start = Math.max(0, errorPos - 150);
        const end = Math.min(cleanText.length, errorPos + 150);
        console.log('🔧 Problem area (original):', cleanText.substring(start, end));
        console.log('🔧 Problem area (fixed):', fixedText.substring(start, end));
        
        // Show character-by-character analysis around error position
        const problemChar = cleanText.charAt(errorPos);
        const prevChar = cleanText.charAt(errorPos - 1);
        const nextChar = cleanText.charAt(errorPos + 1);
        console.log('🔧 Character analysis:');
        console.log(`  Position ${errorPos - 1}: "${prevChar}" (${prevChar.charCodeAt(0)})`);
        console.log(`  Position ${errorPos}: "${problemChar}" (${problemChar.charCodeAt(0)})`);
        console.log(`  Position ${errorPos + 1}: "${nextChar}" (${nextChar.charCodeAt(0)})`);
      }
      
      console.log('🔧 Fixed last 200 chars:', fixedText.substring(Math.max(0, fixedText.length - 200)));
      
      try {
        parsedData = JSON.parse(fixedText);
        console.log('✅ JSON fixed and parsed successfully');
      } catch (secondError) {
        console.error('❌ JSON fix attempt failed:', secondError);
        
        // Final fallback: use position-specific JSON repair
        try {
          console.log('🔧 Attempting position-specific JSON repair...');
          
          let aggressiveFixed = fixedText;
          
          // Position-specific repair around the error location
          if (errorPos && errorPos < aggressiveFixed.length) {
            const start = Math.max(0, errorPos - 10);
            const end = Math.min(aggressiveFixed.length, errorPos + 10);
            const problemArea = aggressiveFixed.substring(start, end);
            
            console.log('🔧 Examining problem area:', problemArea);
            
            // Check if we need to insert a comma at the specific position
            if (errorPos > 0) {
              const charAtError = aggressiveFixed.charAt(errorPos);
              const charBefore = aggressiveFixed.charAt(errorPos - 1);
              
              // Pattern: "text" followed by " (quote) without comma
              if (charBefore === '"' && charAtError === ' ') {
                const nextQuotePos = aggressiveFixed.indexOf('"', errorPos);
                if (nextQuotePos !== -1) {
                  console.log('🔧 Inserting comma at position', errorPos);
                  aggressiveFixed = aggressiveFixed.substring(0, errorPos) + ',' + aggressiveFixed.substring(errorPos);
                }
              }
              // Pattern: "text" followed directly by "text" (no space, no comma)
              else if (charBefore === '"' && charAtError === '"') {
                console.log('🔧 Inserting comma between quotes at position', errorPos);
                aggressiveFixed = aggressiveFixed.substring(0, errorPos) + ',' + aggressiveFixed.substring(errorPos);
              }
            }
          }
          
          // Additional aggressive patterns with iterative fixing
          let prevLength = aggressiveFixed.length;
          let iterations = 0;
          const maxIterations = 5;
          
          // Iterative fixing to catch all patterns
          do {
            prevLength = aggressiveFixed.length;
            iterations++;
            
            console.log(`🔧 Iteration ${iterations} - fixing patterns...`);
            
            // Pattern 1: "text" followed by whitespace and "text" (most common)
            aggressiveFixed = aggressiveFixed.replace(/("[\s\S]*?")(\s+)("[\s\S]*?")/g, '$1,$2$3');
            
            // Pattern 2: "text" immediately followed by "text" (no space)
            aggressiveFixed = aggressiveFixed.replace(/("[\s\S]*?")("[\s\S]*?")/g, '$1,$2');
            
            // Pattern 3: array elements on separate lines without commas
            aggressiveFixed = aggressiveFixed.replace(/("])\s*\n\s*(")/g, '$1,\n$2');
            
            // Pattern 4: fix array ending patterns
            aggressiveFixed = aggressiveFixed.replace(/(")\s+(")/g, '$1,$2');
            
            // Pattern 5: fix summary array specific patterns
            aggressiveFixed = aggressiveFixed.replace(/("summary":\s*\[[\s\S]*?)("[\s\S]*?")(\s+)("[\s\S]*?")/g, '$1$2,$3$4');
            
            // Pattern 6: fix line break patterns in arrays
            aggressiveFixed = aggressiveFixed.replace(/("[\s\S]*?")\n\s*("[\s\S]*?")/g, '$1,\n$2');
            
            console.log(`🔧 After iteration ${iterations}, length: ${aggressiveFixed.length}`);
            
          } while (aggressiveFixed.length !== prevLength && iterations < maxIterations);
          
          console.log(`🔧 Completed ${iterations} iterations of pattern fixing`);
          
          console.log('🔧 Aggressive fix complete, attempting parse...');
          parsedData = JSON.parse(aggressiveFixed);
          console.log('✅ Parsed with aggressive repair');
        } catch (aggressiveError) {
          console.error('❌ Aggressive repair failed:', aggressiveError);
          
          // Ultra fallback: try to validate and fix array structure manually
          try {
            console.log('🔧 Attempting manual array structure repair...');
            
            let manualFixed = cleanText;
            
            // Find all arrays and manually validate them
            const arrayPattern = /\[[\s\S]*?\]/g;
            let match;
            const arrays = [];
            
            while ((match = arrayPattern.exec(manualFixed)) !== null) {
              arrays.push({
                content: match[0],
                start: match.index,
                end: match.index + match[0].length
              });
            }
            
            console.log(`🔧 Found ${arrays.length} arrays to validate`);
            
            // Fix each array individually
            for (const arrayInfo of arrays) {
              let arrayContent = arrayInfo.content;
              
              // Fix missing commas in this specific array
              arrayContent = arrayContent.replace(/("[\s\S]*?")(\s+)("[\s\S]*?")/g, '$1,$2$3');
              arrayContent = arrayContent.replace(/("[\s\S]*?")("[\s\S]*?")/g, '$1,$2');
              arrayContent = arrayContent.replace(/,(\s*\])/g, '$1'); // Remove trailing comma
              
              // Replace in the main text
              manualFixed = manualFixed.substring(0, arrayInfo.start) + 
                           arrayContent + 
                           manualFixed.substring(arrayInfo.end);
            }
            
            parsedData = JSON.parse(manualFixed);
            console.log('✅ Parsed with manual array repair');
            
          } catch (manualError) {
            console.error('❌ Manual array repair failed:', manualError);
            
            // Emergency fallback: Build valid JSON from fragments
            try {
              console.log('🚨 Attempting emergency JSON reconstruction...');
              
              // Try to extract and reconstruct a minimal valid response
              let emergencyJson = cleanText;
              
              // Find the sourceLanguage field
              const sourceLangMatch = emergencyJson.match(/"sourceLanguage":\s*"([^"]+)"/);
              const sourceLanguage = sourceLangMatch ? sourceLangMatch[1] : 'en';
              
              // Find translations array start
              const translationsStart = emergencyJson.indexOf('"translations"');
              if (translationsStart === -1) {
                throw new Error('Cannot find translations array');
              }
              
              // Build minimal valid JSON
              const minimalJson: any = {
                sourceLanguage: sourceLanguage,
                translations: []
              };
              
              // Try to extract at least one translation
              const langMatch = emergencyJson.match(/"lang":\s*"([^"]+)"/);
              const textMatch = emergencyJson.match(/"text":\s*"([^"]+)"/);
              
              if (langMatch && textMatch) {
                minimalJson.translations.push({
                  lang: langMatch[1],
                  text: textMatch[1]
                });
              }
              
              console.log('🚨 Emergency JSON reconstructed:', minimalJson);
              parsedData = minimalJson;
              
            } catch (emergencyError) {
              // Absolute final fallback: extract only valid JSON portion
              try {
                const jsonStart = cleanText.indexOf('{');
                const jsonEnd = cleanText.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                  const truncatedJson = cleanText.substring(jsonStart, jsonEnd + 1);
                  parsedData = JSON.parse(truncatedJson);
                  console.log('✅ Parsed truncated JSON successfully');
                } else {
                  throw new Error('Could not extract valid JSON structure');
                }
              } catch (finalError) {
                console.error('❌ All JSON parsing attempts failed');
                console.error('❌ Final error:', finalError);
                
                // Last resort: return a basic error response that won't crash the system
                console.log('🚨 Returning emergency fallback response');
                parsedData = {
                  sourceLanguage: 'auto',
                  translations: [{
                    lang: targetLangs[0] || 'en',
                    text: 'Translation failed due to JSON parsing error. Please try again.',
                    summary: mode === 'summarize' ? ['1. Translation service encountered an error', '2. Please retry your request'] : undefined
                  }]
                };
              }
            }
          }
        }
      }
    }
    console.log('✅ Parsed Gemini data:', parsedData);

    // summary_markdownがあればsummary配列に変換
    if (parsedData && parsedData.summary_markdown && (!parsedData.summary || parsedData.summary.length === 0)) {
      parsedData.summary = parsedData.summary_markdown.split(/\r?\n/).filter((line: string) => line.trim());
    }

    // summary配列の自動補完: summaryが空/未定義ならtextを行分割してsummary配列に
    if (parsedData && Array.isArray(parsedData.translations)) {
      parsedData.translations = parsedData.translations.map((t: any) => {
        if (mode === 'summarize' && (!t.summary || t.summary.length === 0)) {
          const lines = (t.text || '').split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
          // 番号付きリスト形式の行のみ抽出（なければ全行）
          const numbered = lines.filter((line: string) => /^[0-9]+(\.[0-9]+)*[\.、．] /.test(line) || /^[0-9]+(\.[0-9]+)*[\.、．]/.test(line));
          return { ...t, summary: numbered.length > 0 ? numbered : lines };
        }
        return t;
      });
    }

    // Gemini workaround: Only return the originally requested language(s)
    let filteredTranslations = parsedData.translations;
    if (actualTargetLangs.length !== filterTo.length) {
      filteredTranslations = parsedData.translations.filter((t: any) => filterTo.includes(t.lang));
    }

    if (parsedData && Array.isArray(filteredTranslations)) {
      return { 
        ...parsedData, 
        translations: filteredTranslations,
        resultRawContent: responseText 
      };
    } else {
      throw new Error("Invalid JSON structure received from API.");
    }
  } catch (error) {
    console.error("❌ Error fetching or parsing translations from Gemini:", error);
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