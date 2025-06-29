import { NextRequest, NextResponse } from 'next/server'
import { getTranslations as getGeminiTranslations } from '@/lib/services/geminiService'
import { getTranslations as getGptTranslations } from '@/lib/services/gptService'
import { TranslationMode } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    // Check if request has a body
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { text, sourceLang, targetLangs, mode, apiProvider } = body

    if (!text || !targetLangs || targetLangs.length === 0) {
      return NextResponse.json(
        { error: 'Text and target languages are required' },
        { status: 400 }
      )
    }

    const translationMode: TranslationMode = mode || 'translate'
    
    let result
    try {
      if (apiProvider === 'gemini') {
        result = await getGeminiTranslations(text, sourceLang, targetLangs, translationMode)
      } else {
        result = await getGptTranslations(text, sourceLang, targetLangs, translationMode)
      }
    } catch (translationError) {
      console.error('Translation service error:', translationError)
      return NextResponse.json(
        { error: translationError instanceof Error ? translationError.message : 'Translation service failed' },
        { status: 500 }
      )
    }

    if (!result || !Array.isArray(result.translations)) {
      return NextResponse.json(
        { error: 'Invalid response format from translation service' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 