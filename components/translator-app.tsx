"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HistoryItem, Language, TranslationResult, TranslationMode } from '@/lib/types'
import { FROM_LANGUAGES, OTHER_LANGUAGES, getLanguageByCode } from '@/lib/constants'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AdBanner } from '@/components/ad-banner'
import { 
  History, 
  Copy, 
  Check, 
  Trash2, 
  ChevronDown,
  Languages,
  FileText
} from 'lucide-react'
import { useSession, signIn } from 'next-auth/react'

type ApiProvider = 'gemini' | 'gpt'

// Utility to recursively enforce summary structure
function enforceSummaryStructure(summary: any[], parentId: string = ''): any[] {
  if (!Array.isArray(summary)) return [];
  return summary.map((item, idx) => {
    // 文字列の場合はtitleに格納
    if (typeof item === 'string') {
      return {
        id: parentId ? `${parentId}.${idx + 1}` : `${idx + 1}`,
        title: item,
        children: [],
      };
    }
    // 既存のobject形式
    let id = item.id;
    if (!id || typeof id !== 'string') {
      id = parentId ? `${parentId}.${idx + 1}` : `${idx + 1}`;
    }
    let children = Array.isArray(item.children) ? item.children : [];
    children = enforceSummaryStructure(children, id);
    return {
      id,
      title: item.title || '',
      children,
    };
  });
}

// summary配列を再帰的に番号付きテキストに変換するユーティリティ
function flattenSummaryToText(items: any[], prefix = ''): string[] {
  if (!Array.isArray(items)) return [];
  let lines: string[] = [];
  items.forEach((item, idx) => {
    const number = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
    if (item.title && item.title.trim()) {
      lines.push(`${number}. ${item.title.trim()}`);
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      lines = lines.concat(flattenSummaryToText(item.children, number));
    }
  });
  return lines;
}

// 多言語注意文定義
const NOTICE_TEXTS: Record<string, string> = {
  ja: '【ご注意】本出力はAIによる機械翻訳・要約です。内容の正確性は保証されません。ご自身で必ずご確認ください。',
  en: '[Notice] This output is machine-translated/summarized by AI. Accuracy is not guaranteed. Please verify the content yourself.',
  th: '[ข้อควรระวัง] ข้อมูลนี้เป็นผลลัพธ์จากการแปล/สรุปโดย AI ความถูกต้องอาจไม่สมบูรณ์ กรุณาตรวจสอบด้วยตนเอง',
  default: '[Notice] This output is machine-translated/summarized by AI. Accuracy is not guaranteed. Please verify the content yourself.'
};

export const TranslatorApp: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLangs, setTargetLangs] = useState<string[]>([])
  const [result, setResult] = useState<TranslationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('translationHistory', [])
  const [isHistoryVisible, setIsHistoryVisible] = useState(false)
  const [selectedForCopy, setSelectedForCopy] = useState<Record<string, boolean>>({})
  const [copyButtonText, setCopyButtonText] = useState('Copy Selected')
  const [showMoreLangs, setShowMoreLangs] = useState(false)
  const [mode, setMode] = useState<TranslationMode>('translate')
  // Removed unused placeholderText state
  const apiProvider: ApiProvider = 'gpt'
  // Removed unused isModeDropdownOpen state
  // Removed unused modeDropdownRef
  const abortControllerRef = useRef<AbortController | null>(null)
  const executeTranslationRef = useRef<((text: string, source: string, targets: string[]) => Promise<void>) | null>(null)
  const { data: session, status } = useSession();
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [userPreferredLanguages, setUserPreferredLanguages] = useState<string[]>(['en', 'ja', 'th']);

  // ユーザーの言語使用履歴を取得
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/user-preferred-languages')
        .then(res => res.json())
        .then(data => {
          if (data.preferredLanguages && data.preferredLanguages.length > 0) {
            setUserPreferredLanguages(data.preferredLanguages.slice(0, 3));
          }
        })
        .catch(err => console.log('Failed to fetch preferred languages:', err));
    }
  }, [session?.user?.id]);

  // デバッグ用：コンポーネント初期化ログ
  useEffect(() => {
    console.log('🚀 TranslatorApp initialized');
    console.log('📊 Initial state:', {
      inputText: inputText.substring(0, 20) + (inputText.length > 20 ? '...' : ''),
      sourceLang,
      targetLangs,
      mode,
      session: !!session,
      status
    });
  }, []);

  // デバッグ用：重要なstate変更のログ
  useEffect(() => {
    console.log('🔄 State changed:', {
      inputTextLength: inputText.length,
      targetLangs,
      isLoading,
      session: !!session
    });
  }, [inputText, targetLangs, isLoading, session]);

  useEffect(() => {
    const root = document.documentElement
    // Remove all mode classes
    root.classList.remove('summarize-mode', 'generate-mode')
    // Add current mode class
    if (mode === 'summarize') {
      root.classList.add('summarize-mode')
    } else if (mode === 'generate') {
      root.classList.add('generate-mode')
    }
  }, [mode])

  // Removed unused useEffect for dropdown

  const handleResetSelections = useCallback(() => {
    setSelectedForCopy({})
  }, [])

  const executeTranslation = useCallback(async (text: string, source: string, targets: string[]) => {
    if (!text.trim()) {
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    handleResetSelections()

    try {
      let requestBody: any
      let apiEndpoint: string
      
      if (mode === 'generate') {
        requestBody = {
          keyword: text,
          targetLanguages: targets,
        }
        apiEndpoint = '/api/generate'
        console.log('Sending generation request:', requestBody)
      } else {
        requestBody = {
          text,
          sourceLang: source,
          targetLangs: targets,
          mode,
          apiProvider,
        }
        apiEndpoint = '/api/translate'
        console.log('Sending translation request:', requestBody)
      }
      
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      };
      if (abortControllerRef.current && abortControllerRef.current.signal) {
        fetchOptions.signal = abortControllerRef.current.signal;
      }
      const response = await fetch(apiEndpoint, fetchOptions);

      if (abortControllerRef.current && abortControllerRef.current.signal && abortControllerRef.current.signal.aborted) {
        return
      }

      if (!response.ok) {
        throw new Error(`Translation request failed: ${response.status}`)
      }

      const responseText = await response.text()
      if (!responseText.trim()) {
        throw new Error('Empty response from server')
      }

      let translationResult
      try {
        translationResult = JSON.parse(responseText)
        // --- summary post-processing ---
        if (mode === 'summarize' && translationResult && Array.isArray(translationResult.translations)) {
          translationResult.translations = translationResult.translations.map((t: any) => {
            if (Array.isArray(t.summary) && t.summary.length > 0 && typeof t.summary[0] === 'object') {
              return { ...t, summary: enforceSummaryStructure(t.summary) };
            }
            return t;
          });
        }
        // --- end summary post-processing ---
      } catch (parseError) {
        throw new Error('Invalid JSON response from server')
      }

      if (!translationResult || !Array.isArray(translationResult.translations)) {
        throw new Error('Invalid response format from server')
      }

      setResult(translationResult)
      setIsLoading(false)
      console.log('✅ Result state updated:', translationResult)
      
      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString(),
        inputText: text,
        sourceLang: source,
        targetLangs: targets,
        result: translationResult,
        timestamp: new Date().toLocaleString(),
        mode,
      }

      setHistory(prev => [newHistoryItem, ...prev.slice(0, 9)])
      console.log('✅ History updated with new item')
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        return
      }
      const message = e instanceof Error ? e.message : 'An unknown error occurred.'
      setError(message)
      setIsLoading(false)
    } finally {
      if (abortControllerRef.current && abortControllerRef.current.signal && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current = null
      }
    }
  }, [setHistory, handleResetSelections, apiProvider, mode])

  useEffect(() => {
    executeTranslationRef.current = executeTranslation
  }, [])

  const handleTargetLangClick = useCallback((langCode: string) => {
    const newTargetLangs = targetLangs.includes(langCode)
      ? targetLangs.filter(l => l !== langCode)
      : [...targetLangs, langCode]

    setTargetLangs(newTargetLangs)

    if (newTargetLangs.length === 0) {
      setResult(null)
      setError(null)
      return
    }
  }, [targetLangs, inputText, sourceLang])

  // Debug logging for result state
  useEffect(() => {
    console.log('🔄 Result state changed:', result)
  }, [result])

  const handleLoadHistory = (item: HistoryItem) => {
    setInputText(item.inputText)
    setSourceLang(item.sourceLang)
    setTargetLangs(item.targetLangs)
    setResult(item.result)
    setMode(item.mode || 'translate')
    setError(null)
    setIsHistoryVisible(false)
    handleResetSelections()
  }

  const handleClearHistory = () => {
    setHistory([])
  }

  const getLanguageName = (code: string) => getLanguageByCode(code)?.name || code
  
  const handleToggleCopySelection = (key: string) => {
    setSelectedForCopy(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setSelectionOrder(order => {
        if (next[key]) {
          // 選択時は末尾に追加
          return [...order, key].filter((v, i, arr) => arr.indexOf(v) === i);
        } else {
          // 解除時は除外
          return order.filter(k => k !== key);
        }
      });
      return next;
    });
  }

  const selectedCount = useMemo(() => Object.values(selectedForCopy).filter(Boolean).length, [selectedForCopy])

  const handleMasterCopy = () => {
    let textToCopy = '';
    const sourceLanguageName = result?.sourceLanguage ? getLanguageName(result.sourceLanguage) : 'Source Text'
    selectionOrder.forEach((key) => {
      if (key === 'source' && inputText) {
        textToCopy += `--- ${sourceLanguageName} (Original language) ---\n${inputText}\n\n`;
      } else {
        const t = result?.translations?.find((tr: any) => tr.lang === key);
        if (t) {
          textToCopy += `--- ${getLanguageName(t.lang)} ---\n${NOTICE_TEXTS[t.lang] || NOTICE_TEXTS.default}\n`;
          if (mode === 'summarize' && Array.isArray(t.summary) && t.summary.length > 0) {
            if (typeof t.summary[0] === 'string') {
              textToCopy += t.summary.join('\n') + '\n\n';
            } else {
              textToCopy += flattenSummaryToText(t.summary).join('\n') + '\n\n';
            }
          } else {
            textToCopy += t.text + '\n\n';
          }
        }
      }
    });
    
    // Add GGMTS URL for SNS generate mode
    if (mode === 'generate') {
      textToCopy += '\nhttps://www.ggmts.com/';
    }
    
    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Selected'), 2000);
    });
  }

  // Auth UI moved to GlobalHeader component

  // 実行ボタンのハンドラ
  const handleExecute = () => {
    console.log('🔘 Execute button clicked');
    console.log('🔍 Current state:', {
      session: !!session,
      status,
      inputText: inputText.substring(0, 50) + (inputText.length > 50 ? '...' : ''),
      inputTextLength: inputText.length,
      inputTextTrimmed: inputText.trim().length,
      sourceLang,
      targetLangs,
      targetLangsLength: targetLangs.length,
      mode,
      isLoading
    });
    if (status === 'loading') {
      console.log('⏳ Session loading, wait...');
      return;
    }
    if (!session) {
      console.log('🔐 No session, redirecting to sign in');
      signIn('google');
      return;
    }
    if (!inputText.trim()) {
      console.log('❌ No input text');
      return;
    }
    if (targetLangs.length === 0) {
      console.log('❌ No target languages selected');
      return;
    }
    
    // Character limit validation
    const characterLimits = { translate: 8000, summarize: 12000, generate: 5000 };
    const currentLimit = characterLimits[mode];
    if (inputText.length > currentLimit) {
      console.log('❌ Text exceeds character limit:', inputText.length, '>', currentLimit);
      setError(`制限を超えています。${mode === 'translate' ? '翻訳' : mode === 'summarize' ? '要約' : '生成'}モードの上限は${currentLimit.toLocaleString()}です。現在: ${inputText.length.toLocaleString()}`);
      return;
    }
    
    console.log('✅ Starting translation execution');
    executeTranslation(inputText, sourceLang, targetLangs);
  };

  // --- 3つのトグルスイッチUI ---
  const ModeToggle = () => (
    <div className="flex flex-col sm:flex-row items-center gap-4 my-4">
      <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-xl p-1 w-full sm:w-auto">
        <button
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${
            mode === 'translate' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
          onClick={() => {
            setMode('translate');
            setResult(null);
            setError(null);
            setTargetLangs([]);
            setSelectedForCopy({});
            setSelectionOrder([]);
          }}
        >
          Translate
        </button>
        <button
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${
            mode === 'summarize' 
              ? 'bg-green-500 text-white shadow-md' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
          onClick={() => {
            setMode('summarize');
            setResult(null);
            setError(null);
            setTargetLangs([]);
            setSelectedForCopy({});
            setSelectionOrder([]);
          }}
        >
          Summarize
        </button>
        <button
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${
            mode === 'generate' 
              ? 'bg-purple-500 text-white shadow-md' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
          onClick={() => {
            setMode('generate');
            setResult(null);
            setError(null);
            setTargetLangs([]);
            setSelectedForCopy({});
            setSelectionOrder([]);
            
            // Set template text when generate mode is selected
            if (!inputText.trim()) {
              const template = `Place / 場所:

What to do / 何をする？:

Feeling / 感じたこと・雰囲気:

With who / 誰と？:

Special / 特別なこと:

Tips / おすすめポイント・コツ:

Time / 時期・時間:`;
              setInputText(template);
            }
          }}
        >
          Generate for SNS
        </button>
      </div>
      <button
        className="ml-auto w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-primary hover:bg-blue-100 dark:hover:bg-blue-900 transition"
        onClick={() => setIsHistoryVisible(v => !v)}
        aria-label="Show translation history"
      >
        <History className="w-8 h-8" />
      </button>
    </div>
  );

  return (
    <div className={`relative w-full min-h-screen ${mode === 'summarize' ? 'bg-green-50' : mode === 'generate' ? 'bg-purple-50' : 'bg-blue-50'}`}>
      <div className="flex-grow w-full pt-4 sm:pt-6 md:pt-8">
        <div className="w-full px-2 sm:px-4 md:px-2">
          <div className="flex flex-col xl:flex-row gap-4 w-full">
            <main className="flex-1 w-full">
              <Card className="w-full">
                <CardContent className="p-2 md:p-4 w-full">
                  <ModeToggle />
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                    placeholder={mode === 'translate' ? "Enter text to translate..." : mode === 'summarize' ? "Enter text to summarize..." : "Click 'Generate for SNS' to load template, then fill in each section with your content..."}
                  className="w-full p-3 border border-input bg-transparent rounded-md text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring resize-none transition-shadow"
                  rows={5}
                />
                
                {/* SNS generation mode example guide */}
                {mode === 'generate' && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">入力例 / Examples:</p>
                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                      <p><span className="font-medium">Place / 場所:</span> <span className="italic">e.g. Ishigaki Island, Okinawa / 例：沖縄 石垣島</span></p>
                      <p><span className="font-medium">What to do / 何をする？:</span> <span className="italic">e.g. Snorkeling with colorful fish / 例：カラフルな魚たちとシュノーケリング</span></p>
                      <p><span className="font-medium">Feeling / 感じたこと・雰囲気:</span> <span className="italic">e.g. Like another world – so peaceful and healing / 例：まるで別世界みたいで、とても癒されました</span></p>
                      <p><span className="font-medium">With who / 誰と？:</span> <span className="italic">e.g. With my best friend / 例：大切な友人と一緒に</span></p>
                      <p><span className="font-medium">Special / 特別なこと:</span> <span className="italic">e.g. Spotted a rare blue starfish for the first time! / 例：初めて珍しい青いヒトデを見つけました！</span></p>
                      <p><span className="font-medium">Tips / おすすめポイント・コツ:</span> <span className="italic">e.g. Morning is best for clear water and calm waves / 例：朝のほうが海が穏やかで透明度が高くおすすめです</span></p>
                      <p><span className="font-medium">Time / 時期・時間:</span> <span className="italic">e.g. Visited in October – perfect weather! / 例：10月に訪れました、最高の天気でした！</span></p>
                    </div>
                  </div>
                )}
                
                {/* Character count and limit warning */}
                <div className="flex justify-between items-center mt-2 mb-2">
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const characterLimits = { translate: 8000, summarize: 12000, generate: 5000 };
                      const currentLimit = characterLimits[mode];
                      const textLength = inputText.length;
                      const percentage = (textLength / currentLimit) * 100;
                      const isOverLimit = textLength > currentLimit;
                      const isNearLimit = percentage > 90;
                      
                      return (
                        <span className={`font-medium ${
                          isOverLimit 
                            ? 'text-red-600 dark:text-red-400' 
                            : isNearLimit 
                              ? 'text-yellow-600 dark:text-yellow-400' 
                              : 'text-muted-foreground'
                        }`}>
                          {textLength.toLocaleString()}/{currentLimit.toLocaleString()}
                          {isOverLimit && (
                            <span className="ml-2 text-red-600 dark:text-red-400 font-bold">
                              ({(textLength - currentLimit).toLocaleString()}超過)
                            </span>
                          )}
                          {isNearLimit && !isOverLimit && (
                            <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                              (上限接近 {Math.round(percentage)}%)
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                  {inputText.length > (mode === 'translate' ? 8000 : mode === 'summarize' ? 12000 : 5000) && (
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                      ⚠️ 制限を超えています
                    </div>
                  )}
                </div>
                
                <div className="flex items-center mt-2">
                    {selectionOrder.includes('source') && selectedForCopy['source'] && (
                      <span className="text-3xl font-extrabold text-primary mr-2">{selectionOrder.indexOf('source') + 1}</span>
                    )}
                  <input
                    type="checkbox"
                    id="copy-source"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={!!selectedForCopy['source']}
                    onChange={() => handleToggleCopySelection('source')}
                    disabled={!inputText.trim()}
                  />
                    <label htmlFor="copy-source" className="ml-2 block text-sm text-muted-foreground flex items-center gap-2">
                    Select source text for copy
                      <span className="text-base text-primary font-bold ml-2">Original language</span>
                  </label>
                </div>
                
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label htmlFor="source-lang" className="block text-sm font-medium text-muted-foreground">From</label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex w-full gap-2">
                    <select
                      id="source-lang"
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                            className="w-1/2 min-w-0 pl-3 pr-8 py-1.5 text-sm border-border bg-background focus:outline-none focus:ring-primary focus:border-primary rounded-md h-[36px]"
                    >
                      <option value="auto">Auto-Detect</option>
                      {FROM_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                          <Button
                            onClick={(e) => {
                              console.log('🔘 Button clicked!', e);
                              console.log('🔍 Button state:', {
                                isLoading,
                                inputTextLength: inputText.length,
                                inputTextTrimmed: inputText.trim().length,
                                targetLangsLength: targetLangs.length,
                                disabled: isLoading || !inputText.trim() || targetLangs.length === 0 || status === 'loading' || inputText.length > (mode === 'translate' ? 8000 : mode === 'summarize' ? 12000 : 5000)
                              });
                              handleExecute();
                            }}
                            className={`w-1/2 min-w-0 px-4 py-1.5 text-sm font-bold ${mode === 'summarize' ? 'bg-green-500 hover:bg-green-600' : mode === 'generate' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                            disabled={isLoading || !inputText.trim() || targetLangs.length === 0 || status === 'loading' || inputText.length > (mode === 'translate' ? 8000 : mode === 'summarize' ? 12000 : 5000)}
                            title={`Debug: isLoading=${isLoading}, hasText=${!!inputText.trim()}, targetLangs=${targetLangs.length}, status=${status}, charLimit=${inputText.length}/${mode === 'translate' ? 8000 : 12000}`}
                          >
                            {isLoading ? (mode === 'summarize' ? 'Summarizing...' : mode === 'generate' ? 'Generating...' : 'Translating...') : (mode === 'summarize' ? 'Summarize' : mode === 'generate' ? 'Generate for SNS' : 'Translate')}
                          </Button>
                        </div>
                      </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">To</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {userPreferredLanguages.map(langCode => {
                        const lang = getLanguageByCode(langCode);
                        return lang ? (
                          <Button
                            key={lang.code}
                            variant={targetLangs.includes(lang.code) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleTargetLangClick(lang.code)}
                          >
                            {lang.name}
                          </Button>
                        ) : null;
                      })}
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMoreLangs(!showMoreLangs)}
                      >
                        {showMoreLangs ? 'Hide other languages' : 'Show more languages...'}
                      </Button>

                      <AnimatePresence>
                        {showMoreLangs && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex flex-wrap gap-2"
                          >
                            {OTHER_LANGUAGES.map(lang => (
                              <Button
                                key={lang.code}
                                variant={targetLangs.includes(lang.code) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleTargetLangClick(lang.code)}
                              >
                                {lang.name}
                              </Button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/20 text-destructive-foreground p-4 rounded-md border border-destructive/50"
              >
                {error}
              </motion.div>
            )}

            {isLoading && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin mb-4 h-12 w-12 text-primary border-4 border-primary border-t-transparent rounded-full"></div>
                        <p className="text-lg font-semibold text-primary-foreground drop-shadow-md">
                          {mode === 'summarize' ? 'Summarizing...' : mode === 'generate' ? 'Generating...' : 'Translating...'}
                        </p>
                      </div>
                    </div>
            )}

            {result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card p-6 rounded-lg border border-border shadow-sm"
              >
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Detected language: <span className="font-semibold text-foreground">{getLanguageName(result.sourceLanguage)}</span>
                  </p>
                  <Button
                    onClick={handleMasterCopy}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center gap-2"
                  >
                    {copyButtonText === 'Copied!' ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
                    {copyButtonText === 'Copied!' ? 'Copied!' : `Copy Selected (${selectedCount})`}
                  </Button>
                </div>
                <div className="space-y-4">
                  {result.translations.map((translation) => (
                    <motion.div
                      key={translation.lang}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-lg border bg-secondary"
                    >
                      <div className="flex items-center p-3 border-b border-border">
                              {selectionOrder.includes(translation.lang) && selectedForCopy[translation.lang] && (
                                <span className="text-3xl font-extrabold text-primary mr-3">{selectionOrder.indexOf(translation.lang) + 1}</span>
                              )}
                        <input
                          type="checkbox"
                          id={`copy-${translation.lang}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={!!selectedForCopy[translation.lang]}
                          onChange={() => handleToggleCopySelection(translation.lang)}
                        />
                              <label htmlFor={`copy-${translation.lang}`} className="ml-3 flex-1 flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{getLanguageName(translation.lang)}</h3>
                                <span className="text-xs text-muted-foreground">{NOTICE_TEXTS[translation.lang] || NOTICE_TEXTS.default}</span>
                        </label>
                              {/* 個別コピーボタン */}
                              <CopyButtonWithFeedback 
                                text={mode === 'generate' && (translation as any).snsContents 
                                  ? (translation as any).snsContents.map((sns: any) => {
                                      if (sns.platform === 'youtube') {
                                        return `${sns.platform.toUpperCase()}\nタイトル: ${sns.title}\n\n説明: ${sns.description || sns.content}\n\n${Array.isArray(sns.descriptionHashtags) ? sns.descriptionHashtags.join(' ') : ''}\n\nタグ: ${Array.isArray(sns.tags) ? sns.tags.join(', ') : ''}`;
                                      } else {
                                        return `${sns.platform.toUpperCase()}\n${sns.title}\n\n${sns.content}\n\n${Array.isArray(sns.hashtags) ? sns.hashtags.join(' ') : ''}`;
                                      }
                                    }).join('\n\n---\n\n')
                                  : translation.text
                                } 
                              />
                      </div>
                      <div className="p-4 min-h-[120px]">
                              {mode === 'generate' ? (
                                // SNS Content Generation Display
                                (translation as any).snsContents ? (
                                  <div className="space-y-6">
                                    {(translation as any).snsContents.map((sns: any) => (
                                      <div key={sns.platform} className="border rounded-lg p-4 bg-background">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                                          <h4 className="font-bold text-lg capitalize flex items-center gap-2">
                                            {sns.platform === 'youtube' && '📺'}
                                            {sns.platform === 'x' && '🐦'}
                                            {sns.platform === 'instagram' && '📷'}
                                            {sns.platform === 'facebook' && '📘'}
                                            {sns.platform === 'tiktok' && '🎵'}
                                            {sns.platform.toUpperCase()}
                                          </h4>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                let content = '';
                                                if (sns.platform === 'youtube') {
                                                  content = `タイトル: ${sns.title}\n\n説明: ${sns.description || sns.content}\n\n${Array.isArray(sns.descriptionHashtags) ? sns.descriptionHashtags.join(' ') : ''}\n\nタグ: ${Array.isArray(sns.tags) ? sns.tags.join(', ') : ''}`;
                                                } else {
                                                  // All other platforms: combine title + content as displayed
                                                  content = `${sns.title}\n\n${sns.content}\n\n${Array.isArray(sns.hashtags) ? sns.hashtags.join(' ') : ''}`;
                                                }
                                                navigator.clipboard.writeText(content)
                                              }}
                                              className="flex items-center gap-1"
                                            >
                                              <Copy className="w-4 h-4" />
                                              Copy
                                            </Button>
                                            {(sns.platform === 'x' || sns.platform === 'instagram' || sns.platform === 'facebook' || sns.platform === 'youtube' || sns.platform === 'tiktok') && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  let content = '';
                                                  if (sns.platform === 'youtube') {
                                                    content = `タイトル: ${sns.title}\n\n説明: ${sns.description || sns.content}\n\n${Array.isArray(sns.descriptionHashtags) ? sns.descriptionHashtags.join(' ') : ''}\n\nタグ: ${Array.isArray(sns.tags) ? sns.tags.join(', ') : ''}`;
                                                  } else {
                                                    // All other platforms: combine title + content as displayed
                                                    content = `${sns.title}\n\n${sns.content}\n\n${Array.isArray(sns.hashtags) ? sns.hashtags.join(' ') : ''}`;
                                                  }
                                                  let shareUrl = ''
                                                  
                                                  switch (sns.platform) {
                                                    case 'x':
                                                      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`
                                                      break
                                                    case 'instagram':
                                                      // Copy content to clipboard and open Instagram
                                                      navigator.clipboard.writeText(content)
                                                      shareUrl = 'https://www.instagram.com/'
                                                      break
                                                    case 'facebook':
                                                      // Copy content to clipboard and open Facebook
                                                      navigator.clipboard.writeText(content)
                                                      shareUrl = 'https://www.facebook.com/'
                                                      break
                                                    case 'youtube':
                                                      // Copy content to clipboard and open YouTube Studio
                                                      navigator.clipboard.writeText(content)
                                                      shareUrl = 'https://studio.youtube.com/channel/UC/videos/upload?d=ud'
                                                      break
                                                    case 'tiktok':
                                                      // Copy content to clipboard and open TikTok upload
                                                      navigator.clipboard.writeText(content)
                                                      shareUrl = 'https://www.tiktok.com/upload'
                                                      break
                                                  }
                                                  
                                                  if (shareUrl) {
                                                    window.open(shareUrl, '_blank', 'width=600,height=400')
                                                  }
                                                }}
                                                className="flex items-center gap-1"
                                              >
                                                📤 Share
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          {/* YouTube specific content */}
                                          {sns.platform === 'youtube' && (
                                            <>
                                              <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-1">Title:</p>
                                                <p className="text-base">{sns.title}</p>
                                                {sns.hashtags && Array.isArray(sns.hashtags) && (
                                                  <p className="text-base text-blue-600 mt-1">{sns.hashtags.join(' ')}</p>
                                                )}
                                              </div>
                                              {sns.description && (
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground mb-1">Description:</p>
                                              <div className="text-base whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                                <p>{sns.description}</p>
                                              </div>
                                            </div>
                                              )}
                                            </>
                                          )}
                                          
                                          
                                          {/* Content for non-YouTube platforms */}
                                          {sns.platform !== 'youtube' && (
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground mb-1">Content:</p>
                                              <div className="text-base whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                                <p>{sns.content}</p>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* YouTube tags */}
                                          {sns.platform === 'youtube' && sns.tags && Array.isArray(sns.tags) && (
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground mb-1">Tags:</p>
                                              <p className="text-base text-green-600">{sns.tags.join(', ')}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 italic">No SNS content available.</div>
                                )
                              ) : mode === 'summarize' ? (
                                Array.isArray((translation as any).summary) && (translation as any).summary.length > 0 ? (
                                  typeof (translation as any).summary[0] === 'string' ? (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                                      {(translation as any).summary.join('\n')}
                                    </pre>
                                  ) : (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                                      {flattenSummaryToText((translation as any).summary).join('\n')}
                                    </pre>
                                  )
                                ) : (
                                  <div className="text-gray-400 italic">No summary available.</div>
                                )
                              ) : (
                        <p className="text-foreground whitespace-pre-wrap">{translation.text}</p>
                              )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {isHistoryVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card p-6 rounded-lg border border-border shadow-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">History</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHistory}
                      className="flex items-center gap-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" /> Clear
                    </Button>
                  </div>
                  {history.length > 0 ? (
                    <ul className="space-y-2 max-h-80 overflow-y-auto">
                      {history.map(item => (
                        <li
                          key={item.id}
                          onClick={() => handleLoadHistory(item)}
                          className="p-3 rounded-md bg-secondary hover:bg-accent cursor-pointer transition-colors"
                        >
                          <p className="truncate font-medium text-foreground">{item.inputText}</p>
                          <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No translation history.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
                </CardContent>
              </Card>
              
              <AdBanner title="Advertisement Area" className="h-24" />
          </main>

          <aside className="hidden xl:block w-48 flex-shrink-0 py-8">
            <div className="sticky top-24 space-y-8">
              <AdBanner title="Right Sidebar Ad" className="h-96" />
              <AdBanner title="Right Sidebar Ad 2" className="h-64" />
            </div>
          </aside>
          </div>
        </div>
      </div>

      <footer className="bg-card border-t border-border">
        <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-4">
          <p className="text-center text-xs text-muted-foreground">© 2025 Multi Translator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function CopyButtonWithFeedback({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-2"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      disabled={copied}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}

// Removed unused SummaryList component 