import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getTranslations as geminiTranslate } from '@/lib/services/geminiService'
import { getTranslations as gptTranslate } from '@/lib/services/gptService'

interface SNSContent {
  platform: 'youtube' | 'x' | 'instagram' | 'tiktok'
  title: string
  content: string
  hashtags: string[]
  tags?: string[] // for YouTube tags
  description?: string // for YouTube description
}

interface GenerateResponse {
  keyword: string
  snsContents: SNSContent[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { keyword, targetLanguages } = await request.json()

    if (!keyword) {
      return NextResponse.json({ error: 'キーワードが必要です' }, { status: 400 })
    }

    // Character limit validation
    const textLength = keyword.length
    const currentLimit = 5000
    if (textLength > currentLimit) {
      console.warn(`❌ Text exceeds character limit: ${textLength} > ${currentLimit}`)
      return NextResponse.json(
        { 
          error: `制限を超えています。生成モードの上限は${currentLimit.toLocaleString()}です。現在: ${textLength.toLocaleString()}`,
          characterLimit: currentLimit,
          currentLength: textLength,
          exceeded: textLength - currentLimit
        },
        { status: 400 }
      )
    }

    console.log('🎨 Starting SNS content generation:', {
      keyword: keyword.substring(0, 50) + (keyword.length > 50 ? '...' : ''),
      targetLanguages,
      userId: session?.user?.id || 'anonymous'
    })

    const generatePrompt = `
キーワード: "${keyword}"

以下の4つのSNSプラットフォーム向けのコンテンツを各言語で生成してください。

プラットフォーム別要件:

1. **YouTube**
a. **タイトル**: 先頭にシンプルでインパクトのあるワードを28文字以内。｜で区切ってサブタイトル。場所の情報がある場合は、先頭に国旗を入れる。最大半角100文字
b. **説明**: 不明確な嘘情報は記載しない。国旗のみを含む5つの翻訳：🇯🇵 🇹🇭 🇷🇺 🇲🇲 🇨🇳。最大半角5,000文字（全角2,500文字）
c. **ハッシュタグ**: タイトルに関係のある検索数の多いものを3つ。#Shortsは必ず含める。最大30個まで
d. **タグ**: 1行のカンマ区切りリスト。# 記号は使用不可

2. **Twitter (X)**: YouTubeのタイトルと内容は同じ。最大全角140文字、半角280文字

3. **Instagram**: YouTubeのタイトルと内容は同じ。冒頭の30文字でインパクトを与える。ハッシュタグは最大30個まで。全角・半角を問わず、最大2,200文字まで

4. **TikTok**: タイトル(100文字以内)、キャプション(150文字以内)、ハッシュタグ5個

各プラットフォームの特性を考慮して、エンゲージメントが高くなるような内容にしてください。

JSONレスポンス形式:
{
  "translations": [
    {
      "lang": "ja",
      "snsContents": [
        {
          "platform": "youtube",
          "title": "YouTubeタイトル",
          "description": "YouTube説明文",
          "hashtags": ["#Shorts", "#ハッシュタグ1", "#ハッシュタグ2"],
          "tags": ["タグ1", "タグ2", "タグ3"]
        },
        {
          "platform": "x",
          "title": "Xタイトル",
          "content": "Xツイート文",
          "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"]
        },
        {
          "platform": "instagram",
          "title": "Instagramタイトル",
          "content": "Instagram投稿文",
          "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"]
        },
        {
          "platform": "tiktok",
          "title": "TikTokタイトル",
          "content": "TikTokキャプション",
          "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"]
        }
      ]
    }
  ]
}
`

    let result
    try {
      // Try Gemini first
      result = await geminiTranslate(generatePrompt, 'auto', targetLanguages || ['ja', 'en'], 'translate', 'gemini-1.5-flash')
      console.log('✅ Gemini generation completed successfully')
    } catch (geminiError) {
      console.warn('⚠️ Gemini generation failed, trying GPT:', geminiError)
      try {
        result = await gptTranslate(generatePrompt, 'auto', targetLanguages || ['ja', 'en'], 'translate', 'gpt-4o-mini')
        console.log('✅ GPT generation completed successfully')
      } catch (gptError) {
        console.error('❌ Both services failed:', { geminiError, gptError })
        throw new Error('SNSコンテンツ生成に失敗しました')
      }
    }

    // Log API usage for analytics
    if (session?.user?.id) {
      try {
        const tokens = JSON.stringify(result).length
        const cost = tokens * 0.0001 // Estimated cost
        
        await fetch(`${process.env.NEXTAUTH_URL}/api/admin/usage-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            apiType: 'generate',
            model: 'gemini-1.5-flash',
            inputText: keyword,
            result: JSON.stringify(result),
            tokens,
            cost
          })
        })
      } catch (logError) {
        console.warn('Failed to log API usage:', logError)
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ SNS content generation error:', error)
    return NextResponse.json(
      { error: 'SNSコンテンツ生成に失敗しました' },
      { status: 500 }
    )
  }
}