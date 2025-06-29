import { NextRequest, NextResponse } from 'next/server'
import { getTranslations as getGeminiTranslations } from '@/lib/services/geminiService'
import { getTranslations as getGptTranslations } from '@/lib/services/gptService'
import { TranslationMode } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    // Check if request has a body
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid Content-Type:', contentType)
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    // Get the raw body text first for debugging
    const rawBody = await request.text()
    console.log('Raw request body:', rawBody)

    if (!rawBody.trim()) {
      console.error('Empty request body')
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      )
    }

    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      console.error('Raw body that failed to parse:', rawBody)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    console.log('Parsed request body:', body)

    const { text, sourceLang, targetLangs, mode, apiProvider } = body

    if (!text || !targetLangs || targetLangs.length === 0) {
      console.error('Missing required fields:', { text: !!text, targetLangs: !!targetLangs, targetLangsLength: targetLangs?.length })
      return NextResponse.json(
        { error: 'Text and target languages are required' },
        { status: 400 }
      )
    }

    const translationMode: TranslationMode = mode || 'translate'
    
    console.log('Translation request:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      sourceLang,
      targetLangs,
      mode: translationMode,
      apiProvider
    })
    
    let result
    try {
      if (apiProvider === 'gemini') {
        console.log('Using Gemini API')
        result = await getGeminiTranslations(text, sourceLang, targetLangs, translationMode)
      } else {
        console.log('Using GPT API')
        result = await getGptTranslations(text, sourceLang, targetLangs, translationMode)
      }
    } catch (translationError) {
      console.error('Translation service error:', translationError)
      return NextResponse.json(
        { error: translationError instanceof Error ? translationError.message : 'Translation service failed' },
        { status: 500 }
      )
    }

    console.log('Translation result:', result)

    if (!result || !Array.isArray(result.translations)) {
      console.error('Invalid result format:', result)
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