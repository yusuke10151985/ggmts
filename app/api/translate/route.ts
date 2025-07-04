import { NextRequest, NextResponse } from 'next/server'
import { getTranslations as getGeminiTranslations } from '@/lib/services/geminiService'
import { getTranslations as getGptTranslations } from '@/lib/services/gptService'
import { TranslationMode } from '@/lib/types'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// Timeout promise helper
function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

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
    
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role ?? "free";
    // SettingsからAPIモデル設定を取得
    const settings = await prisma.settings.findMany();
    const getSetting = (key: string) => settings.find(s => s.key === key)?.value;
    // roleごとのモデル設定
    let model = '';
    let provider = '';
    let unitCost = 0.00001;
    if (translationMode === 'summarize') {
      model = getSetting('summarize_api_model') || 'gpt-4o-mini';
    } else {
      model = getSetting('translate_api_model') || 'gpt-4o-mini';
    }
    // モデル名からプロバイダ判定
    if (model.startsWith('gpt')) {
      provider = 'openai';
      unitCost = model === 'gpt-4o-mini' ? 0.001 / 1000 : 0.002 / 1000; // 仮: nanoは0.002/1K
    } else if (model.startsWith('gemini')) {
      provider = 'google';
      unitCost = model === 'gemini-1.5-flash' ? 0.0004 / 1000 : 0.0008 / 1000; // 仮: proは0.0008/1K
    }
    // API実行（管理画面設定値で強制）
    let result;
    try {
      console.log('Starting translation with provider:', provider, 'model:', model);
      let translationPromise;
      if (provider === 'openai') {
        console.log('Using OpenAI/GPT service');
        translationPromise = getGptTranslations(text, sourceLang, targetLangs, translationMode, model);
      } else if (provider === 'google') {
        console.log('Using Google/Gemini service');
        translationPromise = getGeminiTranslations(text, sourceLang, targetLangs, translationMode, model);
      } else {
        console.log('Defaulting to OpenAI/GPT service');
        translationPromise = getGptTranslations(text, sourceLang, targetLangs, translationMode, model);
      }
      result = await timeoutPromise(translationPromise, 25000);
      console.log('Translation completed successfully');
    } catch (translationError) {
      console.error('Translation service error:', translationError)
      console.error('Error details:', {
        message: translationError instanceof Error ? translationError.message : 'Unknown error',
        stack: translationError instanceof Error ? translationError.stack : undefined
      });
      if (translationError instanceof Error && translationError.message === 'Request timed out') {
        return NextResponse.json(
          { error: 'Translation service timed out. Please try again or use shorter input.' },
          { status: 504 }
        )
      }
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

    // --- API実行履歴を記録 ---
    try {
      const userId = session?.user?.id;
      const tokens = text.length + (result.translations?.map((t:any)=>t.text.length).reduce((a:number,b:number)=>a+b,0) || 0);
      const cost = tokens * unitCost;
      
      // ユーザーIDがある場合のみ記録（外部キー制約を満たすため）
      if (userId) {
        // ユーザーが存在するか確認
        let userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true }
        });
        
        if (userExists) {
          await prisma.apiUsageLog.create({
            data: {
              userId,
              apiType: translationMode,
              provider,
              model,
              tokens,
              cost,
              inputText: text.substring(0, 500),
              result: JSON.stringify(result).substring(0, 1000),
            }
          });
          console.log('✅ API usage logged for user:', userId);
        } else {
          console.warn('ユーザーが存在しないため履歴記録をスキップ:', userId);
          
          // セッションからユーザー情報を取得して作成を試行
          if (session?.user?.email) {
            try {
              console.log('Attempting to create missing user for logging:', userId, session.user.email);
              const newUser = await prisma.user.create({
                data: {
                  id: userId,
                  email: session.user.email,
                  name: session.user.name || `User_${userId.slice(-8)}`,
                  image: session.user.image || null,
                  role: 'free'
                }
              });
              
              // ユーザー作成後、再度ログ記録を試行
              await prisma.apiUsageLog.create({
                data: {
                  userId,
                  apiType: translationMode,
                  provider,
                  model,
                  tokens,
                  cost,
                  inputText: text.substring(0, 500),
                  result: JSON.stringify(result).substring(0, 1000),
                }
              });
              console.log('✅ Created user and logged API usage:', newUser.id);
            } catch (createError) {
              console.error('Failed to create user for logging:', createError);
            }
          }
        }
      } else {
        console.warn('未認証ユーザーのため履歴記録をスキップ');
      }
    } catch (logErr) {
      console.error('履歴記録エラー', logErr);
    }
    // ---

    return NextResponse.json(result)
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 