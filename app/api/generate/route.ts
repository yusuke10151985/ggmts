import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getTranslations as geminiTranslate } from '@/lib/services/geminiService'
import { getTranslations as gptTranslate } from '@/lib/services/gptService'

interface SNSContent {
  platform: 'youtube' | 'x' | 'facebook' | 'tiktok'
  title: string
  content: string
  hashtags: string[]
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
1. YouTube: タイトル(60文字以内)、説明文(200文字以内)、ハッシュタグ5個
2. X(Twitter): タイトル(50文字以内)、ツイート文(140文字以内)、ハッシュタグ3個
3. Facebook: タイトル(80文字以内)、投稿文(300文字以内)、ハッシュタグ4個
4. TikTok: タイトル(100文字以内)、キャプション(150文字以内)、ハッシュタグ5個

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
          "content": "YouTube説明文",
          "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"]
        },
        {
          "platform": "x",
          "title": "Xタイトル",
          "content": "Xツイート文",
          "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"]
        },
        {
          "platform": "facebook",
          "title": "Facebookタイトル",
          "content": "Facebook投稿文",
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
      result = await geminiTranslate(generatePrompt, 'auto', targetLanguages || ['ja', 'en'], 'translate', 'gemini')
      console.log('✅ Gemini generation completed successfully')
    } catch (geminiError) {
      console.warn('⚠️ Gemini generation failed, trying GPT:', geminiError)
      try {
        result = await gptTranslate(generatePrompt, 'auto', targetLanguages || ['ja', 'en'], 'translate', 'gpt')
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

    return NextResponse.json({
      sourceLanguage: 'auto',
      ...result
    })

  } catch (error) {
    console.error('❌ SNS content generation error:', error)
    return NextResponse.json(
      { error: 'SNSコンテンツ生成に失敗しました' },
      { status: 500 }
    )
  }
}