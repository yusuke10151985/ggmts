"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HistoryItem, Language, TranslationResult, TranslationMode } from '@/lib/types'
import { FROM_LANGUAGES, PRIORITY_LANGUAGES, OTHER_LANGUAGES, getLanguageByCode } from '@/lib/constants'
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
import { useSession, signIn, signOut } from 'next-auth/react'

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
  const apiProvider: ApiProvider = 'gpt'
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const executeTranslationRef = useRef<((text: string, source: string, targets: string[]) => Promise<void>) | null>(null)
  const { data: session, status } = useSession();
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'summarize') {
      root.classList.add('summarize-mode')
    } else {
      root.classList.remove('summarize-mode')
    }
  }, [mode])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

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
      const requestBody = {
        text,
        sourceLang: source,
        targetLangs: targets,
        mode,
        apiProvider,
      }
      
      console.log('Sending translation request:', requestBody)
      
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      };
      if (abortControllerRef.current && abortControllerRef.current.signal) {
        fetchOptions.signal = abortControllerRef.current.signal;
      }
      const response = await fetch('/api/translate', fetchOptions);

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
    let textToCopy = '【ご注意】本出力はAIによる機械翻訳・要約です。内容の正確性は保証されません。ご自身で必ずご確認ください。\n\n';
    const sourceLanguageName = result?.sourceLanguage ? getLanguageName(result.sourceLanguage) : 'Source Text'
    selectionOrder.forEach((key, idx) => {
      if (key === 'source' && inputText) {
        textToCopy += `--- ${sourceLanguageName} ---\n${inputText}\n\n`;
      } else {
        const t = result?.translations?.find((tr: any) => tr.lang === key);
        if (t) {
          textToCopy += `--- ${getLanguageName(t.lang)} ---\n`;
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
    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Selected'), 2000);
    });
  }

  // --- Auth UI ---
  const AuthButton = () => {
    if (session?.user) {
      return (
        <div className="flex items-center gap-2">
          {session.user.image && (
            <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full border" />
          )}
          <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{session.user.name}</span>
          <Button size="sm" variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>
      );
    }
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => signIn('google')}>Sign in with Google</Button>
      </div>
    );
  };

  // 実行ボタンのハンドラ
  const handleExecute = () => {
    if (!session) {
      signIn('google');
      return;
    }
    executeTranslation(inputText, sourceLang, targetLangs);
  };

  // --- トグルスイッチUI ---
  const ModeToggle = () => (
    <div className="flex items-center gap-4 my-4">
      <span className={`font-bold text-lg ${mode === 'translate' ? 'text-blue-600' : 'text-gray-400'}`}>Translate</span>
      <button
        className={`relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none ${mode === 'summarize' ? 'bg-green-500' : 'bg-blue-500'}`}
        onClick={() => setMode(mode === 'translate' ? 'summarize' : 'translate')}
        aria-label="Toggle mode"
      >
        <span
          className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${mode === 'summarize' ? 'translate-x-8' : ''}`}
        />
      </button>
      <span className={`font-bold text-lg ${mode === 'summarize' ? 'text-green-600' : 'text-gray-400'}`}>Summarize</span>
    </div>
  );

  return (
    <div className={`relative w-full min-h-screen ${mode === 'summarize' ? 'bg-green-50' : 'bg-blue-50'}`}>
      <div className="flex-grow w-full">
        <div className="w-full px-0 md:px-2">
          <div className="flex flex-col xl:flex-row gap-4 w-full">
            <main className="flex-1 w-full">
              <Card className="w-full">
                <CardContent className="p-2 md:p-4 w-full">
                  <ModeToggle />
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={mode === 'translate' ? "Enter text to translate..." : "Enter text to summarize..."}
                    className="w-full p-3 border border-input bg-transparent rounded-md text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring resize-none transition-shadow"
                    rows={5}
                  />
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="copy-source"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={!!selectedForCopy['source']}
                      onChange={() => handleToggleCopySelection('source')}
                      disabled={!inputText.trim()}
                    />
                    <label htmlFor="copy-source" className="ml-2 block text-sm text-muted-foreground">
                      Select source text for copy
                    </label>
                    {selectionOrder.includes('source') && selectedForCopy['source'] && (
                      <span className="ml-1 text-xs text-blue-600">{selectionOrder.indexOf('source') + 1}</span>
                    )}
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
                            onClick={handleExecute}
                            className={`w-1/2 min-w-0 px-4 py-1.5 text-sm font-bold ${mode === 'summarize' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                            disabled={isLoading || !inputText.trim() || targetLangs.length === 0}
                          >
                            {isLoading ? (mode === 'summarize' ? 'Summarizing...' : 'Translating...') : (mode === 'summarize' ? 'Summarize' : 'Translate')}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">To</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {PRIORITY_LANGUAGES.map(lang => (
                          <Button
                            key={lang.code}
                            variant={targetLangs.includes(lang.code) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleTargetLangClick(lang.code)}
                          >
                            {lang.name}
                          </Button>
                        ))}
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
                          {mode === 'summarize' ? 'Summarizing...' : 'Translating...'}
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
                              <input
                                type="checkbox"
                                id={`copy-${translation.lang}`}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={!!selectedForCopy[translation.lang]}
                                onChange={() => handleToggleCopySelection(translation.lang)}
                              />
                              <label htmlFor={`copy-${translation.lang}`} className="ml-3 flex-1">
                                <h3 className="font-semibold text-foreground">{getLanguageName(translation.lang)}</h3>
                                {selectionOrder.includes(translation.lang) && selectedForCopy[translation.lang] && (
                                  <span className="ml-1 text-xs text-blue-600">{selectionOrder.indexOf(translation.lang) + 1}</span>
                                )}
                              </label>
                              {/* 個別コピーボタン */}
                              <CopyButtonWithFeedback text={translation.text} />
                            </div>
                            <div className="p-4 min-h-[120px]">
                              {mode === 'summarize' ? (
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

                  <div className="mb-2 text-xs text-yellow-700 dark:text-yellow-300 font-semibold">【ご注意】本出力はAIによる機械翻訳・要約です。内容の正確性は保証されません。ご自身で必ずご確認ください。</div>

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

// 再帰的にsummaryを表示するコンポーネント
function SummaryList({ items }: { items: any[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ol className="list-decimal list-inside space-y-1">
      {items.map((item, idx) => (
        <li key={item.id || idx}>
          {item.title}
          {Array.isArray(item.children) && item.children.length > 0 && (
            <SummaryList items={item.children} />
          )}
        </li>
      ))}
    </ol>
  );
} 