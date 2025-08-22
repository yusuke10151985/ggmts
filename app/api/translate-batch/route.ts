import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Rate limiter implementation
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  checkLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the time window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
  
  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < 60000); // Keep last minute
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Clean up rate limiter every minute
if (typeof global !== 'undefined' && !global.rateLimiterCleanupInterval) {
  global.rateLimiterCleanupInterval = setInterval(() => rateLimiter.cleanup(), 60000);
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';
    
    if (!rateLimiter.checkLimit(clientIp, 30, 60000)) { // 30 requests per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const { requests } = body;
    
    // Validate request format
    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected array of translation requests.' },
        { status: 400 }
      );
    }
    
    // Limit batch size
    if (requests.length > 10) {
      return NextResponse.json(
        { error: 'Batch size too large. Maximum 10 translations per batch.' },
        { status: 400 }
      );
    }
    
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      // Return mock translations for development
      const mockResults = requests.map((req: any) => ({
        success: true,
        data: {
          en: `[Mock EN] ${req.text}`,
          ja: `[Mock JA] ${req.text}`,
          th: `[Mock TH] ${req.text}`
        }
      }));
      return NextResponse.json(mockResults);
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Process translations in parallel with error handling for each
    const results = await Promise.all(
      requests.map(async (request) => {
        try {
          // Validate individual request
          if (!request.text || typeof request.text !== 'string') {
            throw new Error('Invalid text in request');
          }
          
          if (request.text.length > 5000) {
            throw new Error('Text too long (max 5000 characters)');
          }
          
          // Enhanced prompt for better translation accuracy
          const prompt = `You are a professional translator. Translate the following text into English, Japanese, and Thai.

CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON object with exactly three keys: "en", "ja", "th"
2. Each translation MUST be in its target language - no returning the same text for all three
3. If the source text is already in one of these languages, still translate it to the other two
4. Do NOT include any markdown, code blocks, or explanations - just the JSON

SPECIAL RULES:
- When you see "盤" (ban/board), translate it as "SWGR" in English and Thai
- Preserve all line breaks (\n) in the translations
- Keep technical terms, product codes, and numbers as-is

Text to translate: """${request.text}"""

${request.sourceLang && request.sourceLang !== 'auto' ? `Source language: ${request.sourceLang}` : 'Detect the source language automatically'}

Example response format:
{"en": "Meeting room", "ja": "会議室", "th": "ห้องประชุม"}`;
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          // Parse JSON response with fallback
          let translations;
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            try {
              translations = JSON.parse(jsonMatch[0]);
              
              // Validate translation object
              if (!translations.en || !translations.ja || !translations.th) {
                throw new Error('Invalid translation format');
              }
              
              // Additional validation: check if all translations are the same
              if (translations.en === translations.ja && translations.ja === translations.th) {
                console.warn('All translations are identical, likely an API error:', translations);
                // Attempt to detect source language and fix
                const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(request.text);
                const isThai = /[\u0E00-\u0E7F]/.test(request.text);
                const isEnglish = /^[A-Za-z0-9\s\-.,!?'"]+$/.test(request.text);
                
                if (isJapanese) {
                  translations.ja = request.text;
                  translations.en = `[Needs Translation] ${request.text}`;
                  translations.th = `[ต้องการการแปล] ${request.text}`;
                } else if (isThai) {
                  translations.th = request.text;
                  translations.en = `[Needs Translation] ${request.text}`;
                  translations.ja = `[翻訳が必要] ${request.text}`;
                } else if (isEnglish) {
                  translations.en = request.text;
                  translations.ja = `[翻訳が必要] ${request.text}`;
                  translations.th = `[ต้องการการแปล] ${request.text}`;
                }
              }
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              throw new Error('Failed to parse translation response');
            }
          } else {
            throw new Error('No JSON found in response');
          }
          
          return {
            success: true,
            data: translations
          };
        } catch (error: any) {
          console.error('Translation error for request:', error);
          
          // Return specific error information
          return {
            success: false,
            error: error.message || 'Translation failed',
            // Include original text in error response for fallback handling
            originalText: request.text
          };
        }
      })
    );
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Batch translation error:', error);
    
    // Check for specific error types
    if (error.message?.includes('429') || error.message?.includes('RATE_LIMIT')) {
      return NextResponse.json(
        { error: 'Translation API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('API_KEY')) {
      return NextResponse.json(
        { error: 'Translation API authentication failed. Please check API key.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Translation service error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Declare global type to avoid TypeScript errors
declare global {
  var rateLimiterCleanupInterval: NodeJS.Timeout | undefined;
}