"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HistoryItem, Language, TranslationResult, TranslationMode } from '@/lib/types'
import { getLanguageByCode, DEFAULT_TARGET_LANGUAGES } from '@/lib/constants'
import { UI_TEXT } from '@/lib/constants/uiText'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useDebounceTranslation } from '@/lib/hooks/useDebounceTranslation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AdBanner } from '@/components/ad-banner'
import { TranslationModeToggle } from '@/components/TranslationModeToggle'
import { RealTimeTranslationLayout } from '@/components/RealTimeTranslationLayout'
import { MultiInputRealTimeLayout } from '@/components/MultiInputRealTimeLayout'
import { LanguageSelector } from '@/components/LanguageSelector'
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
import { shouldShowAds } from '@/lib/utils/ads'
import { cn } from '@/lib/utils'
import { 
  formatSummaryOutput, 
  validateSummaryFormat, 
  addHierarchicalNumbering,
  debugSummaryStructure 
} from '@/lib/utils/summaryFormatter'

type ApiProvider = 'gemini' | 'gpt'

// Utility to recursively enforce summary structure
function enforceSummaryStructure(summary: any[], parentId: string = ''): any[] {
  if (!Array.isArray(summary)) return [];
  return summary.map((item, idx) => {
    // If it's a string, store it as title
    if (typeof item === 'string') {
      return {
        id: parentId ? `${parentId}.${idx + 1}` : `${idx + 1}`,
        title: item,
        children: [],
      };
    }
    // Existing object format
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

// Utility to recursively convert summary array to numbered text with proper indentation
function flattenSummaryToText(items: any[], prefix = ''): string[] {
  if (!Array.isArray(items)) return [];
  let lines: string[] = [];
  
  items.forEach((item, idx) => {
    const number = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
    if (item.title && item.title.trim()) {
      // Determine indentation based on hierarchy level
      const level = number.split('.').length - 1;
      const indent = '   '.repeat(level); // 3 spaces per level
      lines.push(`${indent}${number}. ${item.title.trim()}`);
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      lines = lines.concat(flattenSummaryToText(item.children, number));
    }
  });
  
  return lines;
}

// Utility to clean and format summary text with proper indentation
function cleanSummaryText(summaryArray: string[]): string {
  if (!Array.isArray(summaryArray)) return '';
  
  // Join the array and clean up any n/ artifacts
  let text = summaryArray.join('\n');
  
  // Remove n/ artifacts
  text = text.replace(/n\//g, '\n');
  
  // Process lines to ensure proper formatting and indentation
  const lines = text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    
    // Check for hierarchical numbering patterns
    // Main level: 1., 2., 3., etc.
    if (/^\d+\.\s/.test(trimmed)) {
      return trimmed;
    }
    // Sub level: 1.1, 1.2, 2.1, etc.
    else if (/^\d+\.\d+\.?\s/.test(trimmed)) {
      return '   ' + trimmed; // 3 spaces for sub-level
    }
    // Sub-sub level: 1.1.1, 1.1.2, etc.
    else if (/^\d+\.\d+\.\d+\.?\s/.test(trimmed)) {
      return '      ' + trimmed; // 6 spaces for sub-sub-level
    }
    // If line starts with existing spaces, preserve relative indentation
    else if (line.startsWith('   ') || line.startsWith('\t')) {
      return line;
    }
    
    return trimmed;
  }).filter(line => line !== undefined);
  
  return lines.join('\n');
}

// These functions are now imported from summaryFormatter module\n\n// Multi-language notice text definitions
const NOTICE_TEXTS: Record<string, string> = {
  ja: '【ご注意】本出力はAIによる機械翻訳・要約です。内容の正確性は保証されません。ご自身で必ずご確認ください。',
  en: '[Notice] This output is machine-translated/summarized by AI. Accuracy is not guaranteed. Please verify the content yourself.',
  th: '[ข้อควรระวัง] ข้อมูลนี้เป็นผลลัพธ์จากการแปล/สรุปโดย AI ความถูกต้องอาจไม่สมบูรณ์ กรุณาตรวจสอบด้วยตนเอง',
  default: '[Notice] This output is machine-translated/summarized by AI. Accuracy is not guaranteed. Please verify the content yourself.'
};

export const TranslatorApp: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLangs, setTargetLangs] = useState<string[]>(DEFAULT_TARGET_LANGUAGES)
  const [result, setResultInternal] = useState<TranslationResult | null>(null)
  
  // Wrap setResult to add debugging
  const setResult = (newResult: TranslationResult | null) => {
    console.trace('🔍 setResult called with:', newResult ? 'TranslationResult' : 'null')
    if (newResult === null) {
      console.error('⚠️ WARNING: Setting result to null!')
    }
    setResultInternal(newResult)
  }
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('translationHistory', [])
  const [isHistoryVisible, setIsHistoryVisible] = useState(false)
  const [selectedForCopy, setSelectedForCopy] = useState<Record<string, boolean>>({})
  const [copyButtonText, setCopyButtonText] = useState<string>(UI_TEXT.buttons.copySelected)
  const [snsButtonStates, setSnsButtonStates] = useState<Record<string, string>>({})
  const [showMoreLangs, setShowMoreLangs] = useState(false)
  const [mode, setMode] = useState<TranslationMode>('translate')
  const [isRealTimeMode, setIsRealTimeMode] = useState(false)
  const [useMultiInput, setUseMultiInput] = useState(false)
  const apiProvider: ApiProvider = 'gpt'
  const abortControllerRef = useRef<AbortController | null>(null)
  const { data: session, status } = useSession();
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);

  // Use debounced translation hook for real-time mode
  const { 
    results: realtimeResults, 
    isTranslating: isRealtimeTranslating, 
    error: realtimeError 
  } = useDebounceTranslation({
    text: inputText,
    sourceLang,
    targetLangs,
    mode,
    enabled: isRealTimeMode && (mode === 'translate' || mode === 'summarize'),
    delay: 800
  })


  // Debug: Component initialization log
  useEffect(() => {
    console.log('🚀 TranslatorApp initialized');
    console.log('📊 Initial state:', {
      inputText: inputText.substring(0, 20) + (inputText.length > 20 ? '...' : ''),
      sourceLang,
      targetLangs,
      mode,
      session: !!session,
      status,
      isRealTimeMode
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Debug: Track mode changes
  useEffect(() => {
    console.log('🔄 Mode changed to:', mode)
  }, [mode])

  // Debug: Important state change log
  useEffect(() => {
    console.log('🔄 State changed:', {
      inputTextLength: inputText.length,
      targetLangs,
      isLoading,
      session: !!session,
      isRealTimeMode
    });
  }, [inputText, targetLangs, isLoading, session, isRealTimeMode]);

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

  const handleResetSelections = useCallback(() => {
    setSelectedForCopy({})
  }, [])

  const executeTranslation = async (text: string, source: string, targets: string[]) => {
    console.log('🚀 executeTranslation called with:', { text: text.substring(0, 50), source, targets })
    if (!text.trim()) {
      console.log('❌ Empty text, returning')
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    setSelectedForCopy({})

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

      console.log('📊 About to set result:', translationResult)
      console.trace('📊 Setting result from executeTranslation')
      setResult(translationResult)
      console.log('📊 About to set loading false')
      setIsLoading(false)
      console.log('✅ Result state updated:', translationResult)
      
      // State update is complete at this point
      
      // Regression check: Ensure results are visible
      if (!translationResult || translationResult.translations.length === 0) {
        console.error('⚠️ REGRESSION WARNING: No translations in result!')
      }
      
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
      setSelectedForCopy({})
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
  }

  // Debug logging for result state
  useEffect(() => {
    console.log('🔄 Result state changed:', result)
    console.log('🔄 isLoading:', isLoading)
    console.log('🔄 isRealTimeMode:', isRealTimeMode)
    console.log('🔄 Display condition met:', result && !isLoading && !isRealTimeMode)
    
    // Stack trace to find what's clearing the result
    if (result === null && !isLoading) {
      console.trace('⚠️ Result was set to null')
    }
    
    // Regression prevention: Warn if results exist but might not be displayed
    if (result && result.translations && result.translations.length > 0 && !isLoading && !isRealTimeMode) {
      // Check if results are actually visible in DOM
      setTimeout(() => {
        const resultsElement = document.querySelector('.bg-card.p-6.rounded-lg.border')
        if (!resultsElement) {
          console.error('🚨 CRITICAL: Results exist in state but not visible in DOM!')
          console.error('🚨 This is a regression - results should be displayed!')
        }
      }, 100)
    }
  }, [result, isLoading, isRealTimeMode])

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
          // When selected, add to the end
          return [...order, key].filter((v, i, arr) => arr.indexOf(v) === i);
        } else {
          // When deselected, remove from the list
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
      setCopyButtonText(UI_TEXT.labels.copied);
      setTimeout(() => setCopyButtonText(UI_TEXT.buttons.copySelected), 2000);
    });
  }

  // Handle real-time mode change
  const handleRealTimeModeChange = useCallback((isRealTime: boolean) => {
    console.log('🔄 Real-time mode change:', isRealTime)
    setIsRealTimeMode(isRealTime)
    // Don't clear results when switching modes - users should keep their results
  }, [])

  // Handle copy in real-time mode with sequential copy support
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  
  const handleRealTimeCopy = useCallback((text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    setCopyStates(prev => ({ ...prev, [lang]: true }));
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [lang]: false }));
    }, 2000);
  }, [])

  // Execute button handler
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
      setError(UI_TEXT.messages.characterLimitMessage
        .replace('{mode}', UI_TEXT.modes[mode])
        .replace('{limit}', currentLimit.toLocaleString())
        .replace('{current}', inputText.length.toLocaleString()));
      return;
    }
    
    console.log('✅ Starting translation execution');
    // Call executeTranslation directly instead of using ref
    executeTranslation(inputText, sourceLang, targetLangs);
  };

  // --- Mode toggle switch UI ---
  const ModeToggle = useMemo(() => {
    const ModeToggleComponent = () => (
    <div className="flex flex-col sm:flex-row items-center gap-4 my-4">
      {/* Mode buttons */}
      <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-xl p-1 w-full sm:w-auto">
        <button
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${
            mode === 'translate' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
          onClick={() => {
            if (mode !== 'translate') {
              setMode('translate');
              setResult(null);
              setError(null);
              setTargetLangs([]);
              setSelectedForCopy({});
              setSelectionOrder([]);
            }
          }}
        >
          {UI_TEXT.modes.translate}
        </button>
        <button
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${
            mode === 'summarize' 
              ? 'bg-green-500 text-white shadow-md' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
          onClick={() => {
            if (mode !== 'summarize') {
              setMode('summarize');
              setResult(null);
              setError(null);
              setTargetLangs([]);
              setSelectedForCopy({});
              setSelectionOrder([]);
              // Real-time mode is now enabled for summarize
            }
          }}
        >
          {UI_TEXT.modes.summarize}
        </button>
        <button
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${
            mode === 'generate' 
              ? 'bg-purple-500 text-white shadow-md' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
          onClick={() => {
            if (mode !== 'generate') {
              setMode('generate');
              setResult(null);
              setError(null);
              setTargetLangs([]);
              setSelectedForCopy({});
              setSelectionOrder([]);
              setIsRealTimeMode(false); // Disable real-time mode for generate
              
              // Set template text when generate mode is selected
              if (!inputText.trim()) {
                const template = `${UI_TEXT.template.place}:

${UI_TEXT.template.whatToDo}:

${UI_TEXT.template.feeling}:

${UI_TEXT.template.withWho}:

${UI_TEXT.template.special}:

${UI_TEXT.template.tips}:

${UI_TEXT.template.time}:`;
                setInputText(template);
              }
            }
          }}
        >
          {UI_TEXT.modes.generate}
        </button>
      </div>
      
      {/* Real-time mode toggle - Visible in translate and summarize modes */}
      {(mode === 'translate' || mode === 'summarize') && (
        <div className="flex items-center gap-4 flex-shrink-0">
          <TranslationModeToggle onModeChange={handleRealTimeModeChange} />
          {isRealTimeMode && (
            <Button
              variant={useMultiInput ? "default" : "outline"}
              size="sm"
              onClick={() => setUseMultiInput(prev => !prev)}
            >
              {useMultiInput ? "Multi-Input" : "Single Input"}
            </Button>
          )}
        </div>
      )}
      
      {/* History button */}
      <button
        className="ml-auto w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-primary hover:bg-blue-100 dark:hover:bg-blue-900 transition"
        onClick={() => setIsHistoryVisible(v => !v)}
        aria-label={UI_TEXT.tooltips.toggleHistory}
      >
        <History className="w-8 h-8" />
      </button>
    </div>
  );
    ModeToggleComponent.displayName = 'ModeToggle';
    return ModeToggleComponent;
  }, [mode, inputText, isRealTimeMode, isHistoryVisible, handleRealTimeModeChange]);

  // Prepare language objects for RealTimeTranslationLayout
  const targetLanguageObjects = useMemo(() => {
    return targetLangs.map(code => ({
      code,
      name: getLanguageName(code)
    }))
  }, [targetLangs])

  // Determine if we should show ads based on user role
  const userRole = (session?.user as any)?.role
  const showAds = shouldShowAds(userRole)

  return (
    <div className={`relative w-full min-h-screen ${mode === 'summarize' ? 'bg-green-50' : mode === 'generate' ? 'bg-purple-50' : 'bg-blue-50'}`}>
      <div className="flex-grow w-full pt-4 sm:pt-6 md:pt-8">
        <div className={cn(
          "w-full px-2 sm:px-4 md:px-8",
          showAds ? "max-w-7xl mx-auto" : "max-w-full" // Full width when ads are hidden
        )}>
          <div className={cn(
            "flex gap-4 w-full",
            showAds ? "flex-col xl:flex-row" : "flex-col" // Always vertical for full-width
          )}>
            <main className={cn(
              "w-full",
              showAds ? "flex-1" : "max-w-full" // Full width when no ads
            )}>
              <Card className="w-full">
                <CardContent className="p-2 md:p-4 w-full">
                  {/* Language Selection - Using new LanguageSelector component */}
                  <div className="mt-4">
                    <LanguageSelector
                      sourceLang={sourceLang}
                      targetLangs={targetLangs}
                      onSourceLangChange={setSourceLang}
                      onTargetLangChange={setTargetLangs}
                      showMoreLangs={showMoreLangs}
                      onShowMoreChange={setShowMoreLangs}
                    />
                  </div>

                  <ModeToggle />

                  {/* Conditional rendering based on real-time mode */}
                  {/* ⚠️ CRITICAL: DO NOT MODIFY WITHOUT TESTING NORMAL MODE! */}
                  {/* Normal mode (when isRealTimeMode is false) MUST continue to work */}
                  {isRealTimeMode && (mode === 'translate' || mode === 'summarize') ? (
                    useMultiInput ? (
                      <MultiInputRealTimeLayout
                        sourceLang={sourceLang}
                        targetLanguages={targetLanguageObjects}
                        maxChars={mode === 'translate' ? 8000 : 12000}
                        mode={mode}
                        onCopy={handleRealTimeCopy}
                      />
                    ) : (
                      <RealTimeTranslationLayout
                        text={inputText}
                        onTextChange={setInputText}
                        results={realtimeResults}
                        isTranslating={isRealtimeTranslating}
                        error={realtimeError}
                        maxChars={mode === 'translate' ? 8000 : 12000}
                        targetLanguages={targetLanguageObjects}
                        onCopy={handleRealTimeCopy}
                        copyStates={copyStates}
                        sourceLanguage={sourceLang}
                        mode={mode}
                      />
                    )
                  ) : (
                    // Normal mode layout
                    <>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={mode === 'translate' ? UI_TEXT.placeholders.inputText : mode === 'summarize' ? UI_TEXT.placeholders.inputSummarize : UI_TEXT.placeholders.inputGenerate}
                        className={cn(
                          "w-full p-3 border border-input bg-transparent rounded-md text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring resize-none transition-shadow",
                          !showAds && "p-4" // Larger padding for admin/premier
                        )}
                        rows={showAds ? 5 : 8} // More rows for admin/premier
                      />
                      
                      {/* SNS generation mode example guide */}
                      {mode === 'generate' && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Examples:</p>
                          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                            <p><span className="font-medium">{UI_TEXT.template.place}:</span> <span className="italic">{UI_TEXT.template.examples.place}</span></p>
                            <p><span className="font-medium">{UI_TEXT.template.whatToDo}:</span> <span className="italic">{UI_TEXT.template.examples.whatToDo}</span></p>
                            <p><span className="font-medium">{UI_TEXT.template.feeling}:</span> <span className="italic">{UI_TEXT.template.examples.feeling}</span></p>
                            <p><span className="font-medium">{UI_TEXT.template.withWho}:</span> <span className="italic">{UI_TEXT.template.examples.withWho}</span></p>
                            <p><span className="font-medium">{UI_TEXT.template.special}:</span> <span className="italic">{UI_TEXT.template.examples.special}</span></p>
                            <p><span className="font-medium">{UI_TEXT.template.tips}:</span> <span className="italic">{UI_TEXT.template.examples.tips}</span></p>
                            <p><span className="font-medium">{UI_TEXT.template.time}:</span> <span className="italic">{UI_TEXT.template.examples.time}</span></p>
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
                                    (Exceeded by {(textLength - currentLimit).toLocaleString()})
                                  </span>
                                )}
                                {isNearLimit && !isOverLimit && (
                                  <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                                    (Near limit {Math.round(percentage)}%)
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                        {inputText.length > (mode === 'translate' ? 8000 : mode === 'summarize' ? 12000 : 5000) && (
                          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                            ⚠️ {UI_TEXT.messages.characterLimit}
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
                          {UI_TEXT.tooltips.selectForCopy}
                          <span className="text-base text-primary font-bold ml-2">{UI_TEXT.labels.sourceLanguage}</span>
                        </label>
                      </div>
                      
                      <div className="mt-4">
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
                          className={`w-full px-4 py-2 text-sm font-bold ${mode === 'summarize' ? 'bg-green-500 hover:bg-green-600' : mode === 'generate' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                          disabled={isLoading || !inputText.trim() || targetLangs.length === 0 || status === 'loading' || inputText.length > (mode === 'translate' ? 8000 : mode === 'summarize' ? 12000 : 5000)}
                          title={`Debug: isLoading=${isLoading}, hasText=${!!inputText.trim()}, targetLangs=${targetLangs.length}, status=${status}, charLimit=${inputText.length}/${mode === 'translate' ? 8000 : 12000}`}
                        >
                          {isLoading ? UI_TEXT.labels.loading : UI_TEXT.modes[mode]}
                        </Button>
                      </div>
                    </>
                  )}
              
                  {error && !isRealTimeMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/20 text-destructive-foreground p-4 rounded-md border border-destructive/50 mt-4"
                    >
                      {error}
                    </motion.div>
                  )}

                  {isLoading && !isRealTimeMode && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin mb-4 h-12 w-12 text-primary border-4 border-primary border-t-transparent rounded-full"></div>
                        <p className="text-lg font-semibold text-primary-foreground drop-shadow-md">
                          {UI_TEXT.labels.loading}
                        </p>
                      </div>
                    </div>
                  )}

                  {result && !isLoading && !isRealTimeMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card p-6 rounded-lg border border-border shadow-sm mt-4"
                      onAnimationStart={() => console.log('🎬 Result animation started')}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-muted-foreground">
                          {UI_TEXT.labels.sourceLanguage}: <span className="font-semibold text-foreground">{getLanguageName(result.sourceLanguage)}</span>
                        </p>
                        <Button
                          onClick={handleMasterCopy}
                          disabled={selectedCount === 0}
                          className="inline-flex items-center gap-2"
                        >
                          {copyButtonText === UI_TEXT.labels.copied ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
                          {copyButtonText === UI_TEXT.labels.copied ? UI_TEXT.labels.copied : `${UI_TEXT.buttons.copySelected} (${selectedCount})`}
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
                                        return `${sns.platform.toUpperCase()}\n${UI_TEXT.labels.title}: ${sns.title}\n\n${UI_TEXT.labels.description}: ${sns.description || sns.content}\n\n${Array.isArray(sns.descriptionHashtags) ? sns.descriptionHashtags.join(' ') : ''}\n\n${UI_TEXT.labels.tags}: ${Array.isArray(sns.tags) ? sns.tags.join(', ') : ''}`;
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
                                                  content = `${UI_TEXT.labels.title}: ${sns.title}${Array.isArray(sns.hashtags) ? ' ' + sns.hashtags.join(' ') : ''}\n\n${UI_TEXT.labels.description}: ${sns.description || sns.content}\n\n${Array.isArray(sns.descriptionHashtags) ? sns.descriptionHashtags.join(' ') : ''}\n\n${UI_TEXT.labels.tags}: ${Array.isArray(sns.tags) ? sns.tags.join(', ') : ''}`;
                                                } else {
                                                  // All other platforms: just content
                                                  content = sns.content;
                                                  // Ensure X/Twitter has the URL
                                                  if (sns.platform === 'x' && !content.includes('https://www.ggmts.com')) {
                                                    content += '\n\nhttps://www.ggmts.com';
                                                  }
                                                }
                                                navigator.clipboard.writeText(content)
                                                setSnsButtonStates(prev => ({ ...prev, [`${translation.lang}-${sns.platform}`]: `✓ ${UI_TEXT.labels.copied}` }))
                                                setTimeout(() => {
                                                  setSnsButtonStates(prev => ({ ...prev, [`${translation.lang}-${sns.platform}`]: UI_TEXT.buttons.copy }))
                                                }, 2000)
                                              }}
                                              className="flex items-center gap-1"
                                            >
                                              <Copy className="w-4 h-4" />
                                              {snsButtonStates[`${translation.lang}-${sns.platform}`] || UI_TEXT.buttons.copy}
                                            </Button>
                                            {(sns.platform === 'x' || sns.platform === 'instagram' || sns.platform === 'facebook' || sns.platform === 'youtube' || sns.platform === 'tiktok') && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  let content = '';
                                                  if (sns.platform === 'youtube') {
                                                    content = `${UI_TEXT.labels.title}: ${sns.title}\n\n${UI_TEXT.labels.description}: ${sns.description || sns.content}\n\n${Array.isArray(sns.descriptionHashtags) ? sns.descriptionHashtags.join(' ') : ''}\n\n${UI_TEXT.labels.tags}: ${Array.isArray(sns.tags) ? sns.tags.join(', ') : ''}`;
                                                  } else {
                                                    // All other platforms: just content
                                                    content = sns.content;
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
                                                📤 {UI_TEXT.snsButtons.share}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          {/* YouTube specific content */}
                                          {sns.platform === 'youtube' && (
                                            <>
                                              <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-1">{UI_TEXT.labels.title}:</p>
                                                <p className="text-base">{sns.title}</p>
                                                {sns.hashtags && Array.isArray(sns.hashtags) && (
                                                  <p className="text-base text-blue-600 mt-1">{sns.hashtags.join(' ')}</p>
                                                )}
                                              </div>
                                              {sns.description && (
                                                <div>
                                                  <p className="text-sm font-medium text-muted-foreground mb-1">{UI_TEXT.labels.description}:</p>
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
                                              <p className="text-sm font-medium text-muted-foreground mb-1">{UI_TEXT.labels.content}:</p>
                                              <div className="text-base whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                                <p>{sns.content}</p>
                                                {sns.platform === 'x' && !sns.content.includes('https://www.ggmts.com') && (
                                                  <p className="mt-2 text-blue-600">https://www.ggmts.com</p>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* YouTube tags */}
                                          {sns.platform === 'youtube' && sns.tags && Array.isArray(sns.tags) && (
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground mb-1">{UI_TEXT.labels.tags}:</p>
                                              <p className="text-base text-green-600">{sns.tags.join(', ')}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 italic">{UI_TEXT.messages.noSnsContent}</div>
                                )
                              ) : mode === 'summarize' ? (
                                Array.isArray((translation as any).summary) && (translation as any).summary.length > 0 ? (
                                  typeof (translation as any).summary[0] === 'string' ? (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                                      {(() => {
                                        let cleanedText = cleanSummaryText((translation as any).summary);
                                        
                                        // Validate hierarchical format
                                        if (!validateSummaryFormat(cleanedText)) {
                                          console.warn('⚠️ Summary lacks hierarchical format, applying fallback formatting');
                                          cleanedText = addHierarchicalNumbering(cleanedText);
                                        }
                                        
                                        // Debug summary structure in development
                                        if (process.env.NODE_ENV === 'development') {
                                          debugSummaryStructure(cleanedText);
                                        }
                                        
                                        // Debug log to check for n/ issue
                                        if (cleanedText.includes('n/')) {
                                          console.warn('⚠️ Found n/ in summary after cleaning:', cleanedText);
                                        }
                                        
                                        return cleanedText;
                                      })()}
                                    </pre>
                                  ) : (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                                      {flattenSummaryToText((translation as any).summary).join('\n')}
                                    </pre>
                                  )
                                ) : (
                                  <div className="text-gray-400 italic">{UI_TEXT.messages.noSummary}</div>
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
                        className="bg-card p-6 rounded-lg border border-border shadow-sm mt-4"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-semibold">{UI_TEXT.history.title}</h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearHistory}
                            className="flex items-center gap-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" /> {UI_TEXT.history.clear}
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
                          <p className="text-muted-foreground text-center py-4">{UI_TEXT.history.empty}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
              
              {showAds && <AdBanner title="Advertisement Area" className="h-24" />}
            </main>

            {showAds && (
              <aside className="hidden xl:block w-48 flex-shrink-0 py-8">
                <div className="sticky top-24 space-y-8">
                  <AdBanner title="Right Sidebar Ad" className="h-96" />
                  <AdBanner title="Right Sidebar Ad 2" className="h-64" />
                </div>
              </aside>
            )}
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
      {copied ? UI_TEXT.labels.copied : UI_TEXT.buttons.copy}
    </Button>
  );
}