import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getTranslations as geminiTranslate } from '@/lib/services/geminiService'
import { getTranslations as gptTranslate } from '@/lib/services/gptService'
import prisma from '@/lib/prisma'

interface SNSContent {
  platform: 'youtube' | 'x' | 'instagram' | 'facebook' | 'tiktok'
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

以下の5つのSNSプラットフォーム向けのコンテンツを各言語で生成してください。

重要：文字数はあくまで最大数です。入力情報から自然に生成し、無理やり文字数を増やさないでください。

プラットフォーム別要件:

1. **YouTube**
a. **タイトル**: 先頭にシンプルでインパクトのあるワードを28文字以内。｜で区切ってサブタイトル。場所の情報がある場合は、先頭に国旗を入れる。ハッシュタグはタイトルに関係のある検索数の多いものを3つ。#Shortsは必ず入れる。最大半角100文字
b. **説明**: 不明確な嘘情報は記載しない。Toで指定した言語のみで出力する。ハッシュタグは説明に関係のある検索数の多いものを30個まで。タイトルと異なるハッシュタグとする。最大半角5,000文字（全角2,500文字）。最後に「この記事はhttps://www.ggmts.comで生成しました」を出力言語で記載。
c. **タグ**: 1行のカンマ区切りリスト。# 記号は使用不可

2. **Twitter (X)**: タイトルと内容を記載し、関連するハッシュタグを3-5個追加。**必ず最後に改行して「https://www.ggmts.com」を単独で記載してください**。最大全角140文字、半角280文字

3. **Instagram**: タイトルと内容を記載。冒頭の30文字でインパクトを与える。ハッシュタグは最大30個まで。全角・半角を問わず、最大2,200文字まで。最後に「この記事はhttps://www.ggmts.comで生成しました」を出力言語で記載。

4. **Facebook**: Instagramと同じ

5. **TikTok**: タイトルと内容を記載。冒頭の70文字でインパクトを与える。ハッシュタグは制限がないので多めに。全角最大150文字まで。最後に「この記事はhttps://www.ggmts.comで生成しました」を出力言語で記載。

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
          "descriptionHashtags": ["#説明用ハッシュタグ1", "#説明用ハッシュタグ2"],
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

    // 管理画面設定からAPIモデル設定を取得
    const settings = await prisma.settings.findMany();
    const getSetting = (key: string) => settings.find(s => s.key === key)?.value;
    
    // 生成モード用のモデル設定を取得
    let model = getSetting('generate_api_model') || 'gemini-1.5-flash';
    let provider = '';
    let unitCost = 0.00001;
    
    // モデル名からプロバイダ判定
    if (model.startsWith('gpt')) {
      provider = 'openai';
      unitCost = model === 'gpt-4o-mini' ? 0.001 / 1000 : 0.002 / 1000;
    } else if (model.startsWith('gemini')) {
      provider = 'google';
      unitCost = model === 'gemini-1.5-flash' ? 0.0004 / 1000 : 0.0008 / 1000;
    }
    
    console.log('🎨 Using model for generation:', { provider, model });
    
    let result
    try {
      if (provider === 'openai') {
        console.log('Using OpenAI/GPT service for generation');
        result = await gptTranslate(generatePrompt, 'auto', targetLanguages || ['ja', 'en'], 'translate', model);
        console.log('✅ GPT generation completed successfully');
      } else {
        console.log('Using Google/Gemini service for generation');
        result = await geminiTranslate(generatePrompt, 'auto', targetLanguages || ['ja', 'en'], 'translate', model);
        console.log('✅ Gemini generation completed successfully');
      }
    } catch (error) {
      console.error('❌ Generation service failed:', error);
      throw new Error('SNSコンテンツ生成に失敗しました');
    }

    // Log API usage for analytics
    if (session?.user?.id) {
      try {
        const tokens = keyword.length + JSON.stringify(result).length
        const cost = tokens * unitCost
        
        // Check if user exists
        const userExists = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true }
        });
        
        if (userExists) {
          await prisma.apiUsageLog.create({
            data: {
              userId: session.user.id,
              apiType: 'generate',
              provider,
              model,
              tokens,
              cost,
              inputText: keyword.substring(0, 500),
              result: JSON.stringify(result).substring(0, 1000),
            }
          });
          console.log('✅ API usage logged for user:', session.user.id);
        } else {
          console.warn('User not found, skipping usage log:', session.user.id);
        }
      } catch (logError) {
        console.warn('Failed to log API usage:', logError)
      }
    } else {
      console.warn('No authenticated user, skipping usage log');
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