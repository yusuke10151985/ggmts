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

type ApiProvider = 'gemini' | 'gpt'

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
  const [apiProvider, setApiProvider] = useLocalStorage<ApiProvider>('apiProvider', 'gemini')
  const [mode, setMode] = useLocalStorage<TranslationMode>('translationMode', 'translate')
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const executeTranslationRef = useRef<((text: string, source: string, targets: string[]) => Promise<void>) | null>(null)

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
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLang: source,
          targetLangs: targets,
          mode,
          apiProvider,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (abortControllerRef.current.signal.aborted) {
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
      } catch (parseError) {
        throw new Error('Invalid JSON response from server')
      }

      if (!translationResult || !Array.isArray(translationResult.translations)) {
        throw new Error('Invalid response format from server')
      }

      setResult(translationResult)
      
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
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        return
      }
      const message = e instanceof Error ? e.message : 'An unknown error occurred.'
      setError(message)
    } finally {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    }
  }, [setHistory, handleResetSelections, apiProvider, mode])

  useEffect(() => {
    executeTranslationRef.current = executeTranslation
  }, [executeTranslation])

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

    if (inputText.trim() && executeTranslationRef.current) {
      executeTranslationRef.current(inputText, sourceLang, newTargetLangs)
    }
  }, [targetLangs, inputText, sourceLang])

  useEffect(() => {
    if (inputText.trim() && targetLangs.length > 0 && executeTranslationRef.current) {
      const timeoutId = setTimeout(() => {
        executeTranslationRef.current!(inputText, sourceLang, targetLangs)
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [inputText, sourceLang, targetLangs])

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
    setSelectedForCopy(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedCount = useMemo(() => Object.values(selectedForCopy).filter(Boolean).length, [selectedForCopy])

  const handleMasterCopy = () => {
    let textToCopy = ''
    const sourceLanguageName = result?.sourceLanguage ? getLanguageName(result.sourceLanguage) : 'Source Text'

    if (selectedForCopy['source'] && inputText) {
      textToCopy += `--- ${sourceLanguageName} ---\n${inputText}\n\n`
    }

    result?.translations.forEach(t => {
      if (selectedForCopy[t.lang]) {
        textToCopy += `--- ${getLanguageName(t.lang)} ---\n${t.text}\n\n`
      }
    })
    
    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
      setCopyButtonText('Copied!')
      setTimeout(() => setCopyButtonText('Copy Selected'), 2000)
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex-1 flex justify-start">
            <div ref={modeDropdownRef} className="relative">
              <Button
                variant="ghost"
                onClick={() => setIsModeDropdownOpen(prev => !prev)}
                className="text-xl md:text-2xl font-bold flex items-center gap-2"
              >
                {mode === 'translate' ? <Languages className="w-7 h-7 text-primary" /> : <FileText className="w-7 h-7 text-primary" />}
                <span className="capitalize">{mode === 'translate' ? 'Translator' : 'Summarizer'}</span>
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform transform ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              <AnimatePresence>
                {isModeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-20 py-1"
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${mode === 'translate' ? 'bg-accent text-accent-foreground' : ''}`}
                      onClick={() => {
                        setMode('translate')
                        setIsHistoryVisible(false)
                        setIsModeDropdownOpen(false)
                      }}
                    >
                      <Languages className="w-4 h-4 mr-2" />
                      Translator
                    </Button>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${mode === 'summarize' ? 'bg-accent text-accent-foreground' : ''}`}
                      onClick={() => {
                        setMode('summarize')
                        setIsHistoryVisible(false)
                        setIsModeDropdownOpen(false)
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Summarizer
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex-1 flex justify-end items-center gap-2">
            <div className="flex items-center p-1 bg-muted rounded-lg">
              <Button 
                variant={apiProvider === 'gemini' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApiProvider('gemini')}
                className="capitalize"
              >
                Gemini
              </Button>
              <Button
                variant={apiProvider === 'gpt' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApiProvider('gpt')}
                className="capitalize"
              >
                GPT
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsHistoryVisible(!isHistoryVisible)}
            >
              <History className="w-5 h-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <div className="flex-grow container mx-auto w-full">
        <div className="flex justify-center gap-8">
          <aside className="hidden xl:block w-48 flex-shrink-0 py-8">
            <div className="sticky top-24 space-y-8">
              <AdBanner title="Left Sidebar Ad" className="h-96" />
              <AdBanner title="Left Sidebar Ad 2" className="h-64" />
            </div>
          </aside>
          
          <main className="w-full max-w-4xl py-4 md:py-8 space-y-6">
            <Card>
              <CardContent className="p-6">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={mode === 'translate' ? "Enter text to translate..." : "Enter text to translate and summarize..."}
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
                </div>
                
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label htmlFor="source-lang" className="block text-sm font-medium text-muted-foreground">From</label>
                    <select
                      id="source-lang"
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border bg-background focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md h-[42px]"
                    >
                      <option value="auto">Auto-Detect</option>
                      {FROM_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
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
              </CardContent>
            </Card>
            
            <AdBanner title="Advertisement Area" className="h-24" />
              
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center items-center p-6 bg-card rounded-lg border border-border shadow-sm"
              >
                <div className="animate-spin mr-3 h-6 w-6 text-primary border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-muted-foreground">{mode === 'summarize' ? 'Summarizing' : 'Translating'} with {apiProvider}...</p>
              </motion.div>
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
                        </label>
                      </div>
                      <div className="p-4 min-h-[120px]">
                        <p className="text-foreground whitespace-pre-wrap">{translation.text}</p>
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
          </main>

          <aside className="hidden xl:block w-48 flex-shrink-0 py-8">
            <div className="sticky top-24 space-y-8">
              <AdBanner title="Right Sidebar Ad" className="h-96" />
              <AdBanner title="Right Sidebar Ad 2" className="h-64" />
            </div>
          </aside>
        </div>
      </div>

      <footer className="bg-card border-t border-border">
        <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-4">
          <AdBanner title="Footer Advertisement Area" className="h-16" />
          <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
            <a href="/privacy-policy" className="hover:text-primary hover:underline">Privacy Policy</a>
            <span>&middot;</span>
            <a href="/terms" className="hover:text-primary hover:underline">Terms of Service</a>
          </div>
          <p className="text-center text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Multilingual Translator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
} 