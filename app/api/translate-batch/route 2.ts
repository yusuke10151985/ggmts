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
          
          const prompt = `Translate the following text to English, Japanese, and Thai.
Return ONLY a JSON object with keys "en", "ja", "th".
Apply these special rules:
- "盤" should be translated as "SWGR" in English
- Preserve line breaks and formatting
- If the source language is already one of the target languages, keep it unchanged for that language

Text to translate: "${request.text}"
Source language: ${request.sourceLang || 'auto-detect'}`;
          
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