import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        details: 'Please login first'
      }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Not authorized',
        details: 'Admin access required'
      }, { status: 403 });
    }

    const result = {
      gemini_api_configured: !!process.env.GEMINI_API_KEY,
      gemini_api_key_preview: process.env.GEMINI_API_KEY ? 
        `***${process.env.GEMINI_API_KEY.slice(-6)}` : 'NOT SET',
      translation_test: null as any,
      error: null as string | null
    };

    // Test translation if API key is configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Test translation
        const testText = '会議の議事録です。';
        const prompt = `Translate the following Japanese text to English and Thai. 
Return the result in JSON format like this:
{
  "en": "English translation",
  "th": "Thai translation"
}

Text to translate: ${testText}`;

        const response = await model.generateContent(prompt);
        const responseText = response.response.text();
        
        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const translations = JSON.parse(jsonMatch[0]);
          result.translation_test = {
            original: testText,
            translations: translations,
            success: true
          };
        } else {
          result.translation_test = {
            original: testText,
            raw_response: responseText,
            success: false,
            error: 'Could not parse translation response'
          };
        }

      } catch (error: any) {
        result.error = error.message;
        
        // Provide specific guidance
        if (error.message.includes('API_KEY_INVALID')) {
          result.error = 'Invalid Gemini API Key. Please check your key.';
        } else if (error.message.includes('PERMISSION_DENIED')) {
          result.error = 'Gemini API is not enabled for this key.';
        } else if (error.message.includes('quota')) {
          result.error = 'API quota exceeded. Please check your usage limits.';
        }
      }
    } else {
      result.error = 'GEMINI_API_KEY not configured in environment variables';
    }

    return NextResponse.json({
      success: result.gemini_api_configured && !result.error && result.translation_test?.success,
      result,
      instructions: !result.gemini_api_configured ? 
        'Please set GEMINI_API_KEY in Vercel environment variables' :
        result.error ? 
          `Please fix: ${result.error}` :
          'Translation is working correctly!'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Not authorized'
      }, { status: 403 });
    }

    const { text } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'Translation not configured',
        details: 'GEMINI_API_KEY is missing'
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Translate the following text to English and Thai. 
Important rules:
- Keep technical terms, acronyms, and proper nouns unchanged
- Maintain the original formatting
- Return ONLY a JSON object with "en" and "th" keys

Text to translate: ${text}`;

    const response = await model.generateContent(prompt);
    const responseText = response.response.text();
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const translations = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        success: true,
        translations
      });
    } else {
      return NextResponse.json({
        error: 'Failed to parse translation',
        raw_response: responseText
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Translation failed',
      details: error.message 
    }, { status: 500 });
  }
}