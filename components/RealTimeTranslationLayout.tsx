'use client'

import { useEffect, useState } from 'react'
import { Loader2, Copy, Check } from 'lucide-react'
import { TranslationResult, Language, TranslationMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UI_TEXT } from '@/lib/constants/uiText'
import { SelectableText } from '@/components/SelectableText'
import { useBulkCopy } from '@/lib/hooks/useBulkCopy'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { getLanguageByCode } from '@/lib/constants'
import { cleanSummaryText, validateSummaryFormat, addHierarchicalNumbering, debugSummaryStructure } from '@/lib/utils/summaryFormatter'

interface RealTimeTranslationLayoutProps {
  text: string
  onTextChange: (text: string) => void
  results: TranslationResult | null
  isTranslating: boolean
  error: string | null
  maxChars: number
  targetLanguages: Language[]
  onCopy: (text: string, lang: string) => void
  copyStates?: Record<string, boolean>
  sourceLanguage?: string
  mode?: TranslationMode
}

export function RealTimeTranslationLayout({
  text,
  onTextChange,
  results,
  isTranslating,
  error,
  maxChars,
  targetLanguages,
  onCopy,
  copyStates = {},
  sourceLanguage,
  mode = 'translate',
}: RealTimeTranslationLayoutProps) {
  const [primaryTranslation, setPrimaryTranslation] = useState<{ lang: string; text: string; summary?: string[] } | null>(null)
  const [secondaryTranslation, setSecondaryTranslation] = useState<{ lang: string; text: string; summary?: string[] } | null>(null)
  const [localCopyStates, setLocalCopyStates] = useState<Record<string, boolean>>({})
  const [bulkCopyText, setBulkCopyText] = useState('')
  
  const {
    selectedItems,
    toggleSelection,
    copySelected,
    clearSelection,
    isSelected,
    getSelectionOrder
  } = useBulkCopy()

  useEffect(() => {
    if (results?.translations) {
      const translations = results.translations
      setPrimaryTranslation(translations[0] || null)
      setSecondaryTranslation(translations[1] || null)
    } else {
      setPrimaryTranslation(null)
      setSecondaryTranslation(null)
    }
  }, [results])

  const charCount = text.length
  const charPercent = (charCount / maxChars) * 100
  const isNearLimit = charPercent > 80
  const isOverLimit = charCount > maxChars

  const handleBulkCopy = () => {
    copySelected()
    setBulkCopyText(UI_TEXT.labels.copied)
    setTimeout(() => setBulkCopyText(''), 2000)
  }

  // Helper to get display text based on mode
  const getDisplayText = (translation: { text: string; summary?: string[] } | null): string => {
    if (!translation) return '';
    
    if (mode === 'summarize' && translation.summary && Array.isArray(translation.summary)) {
      // Clean and format summary
      let summaryText = cleanSummaryText(translation.summary);
      
      // Validate hierarchical format
      if (!validateSummaryFormat(summaryText)) {
        console.warn('⚠️ Summary lacks hierarchical format in real-time mode, applying fallback formatting');
        summaryText = addHierarchicalNumbering(summaryText);
      }
      
      return summaryText;
    }
    
    return translation.text;
  };

  return (
    <>
      {/* Top Controls - Source Language, Bulk Copy Checkbox, and Copy Selected Button */}
      <div className="mb-4 flex flex-col gap-2">
        {/* Source Language */}
        <p className="text-sm text-muted-foreground">
          {(results?.sourceLanguage || sourceLanguage) && (
            <>
              {UI_TEXT.labels.sourceLanguage}: <span className="font-semibold text-foreground">{getLanguageByCode(results?.sourceLanguage || sourceLanguage || '')?.name || results?.sourceLanguage || sourceLanguage}</span>
            </>
          )}
        </p>
        
        {/* Click to select for bulk copy - moved from input column */}
        {text.trim() && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected('input')}
              onCheckedChange={() => toggleSelection({ 
                id: 'input', 
                text, 
                type: 'input',
                sourceLanguage: sourceLanguage || results?.sourceLanguage
              })}
              aria-label="Select input text for copying"
            />
            {isSelected('input') && getSelectionOrder('input') !== undefined && (
              <span className="text-3xl font-extrabold text-primary">
                {getSelectionOrder('input')}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{UI_TEXT.tooltips.selectForCopy}</span>
          </div>
        )}
        
        {/* Copy Selected Button */}
        <Button
          onClick={handleBulkCopy}
          disabled={selectedItems.length === 0}
          className="inline-flex items-center gap-2 self-start"
        >
          {bulkCopyText ? (
            <><Check className="w-5 h-5"/> {bulkCopyText}</>
          ) : (
            <><Copy className="w-5 h-5"/> {UI_TEXT.buttons.copySelected} ({selectedItems.length})</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Input Column */}
        <div className="flex flex-col">
          <div className="relative flex-1">
            <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={UI_TEXT.placeholders.inputText}
            className={cn(
              "w-full min-h-[300px] p-4 rounded-lg border resize-none",
              "bg-background text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              isOverLimit && "border-red-500 focus:ring-red-500"
            )}
          />
          <div className={cn(
            "absolute bottom-2 right-2 text-xs",
            isNearLimit && "text-orange-500",
            isOverLimit && "text-red-500"
          )}>
            {charCount} / {maxChars}
          </div>
          </div>
        </div>

      {/* Primary Translation Column */}
      <div className="flex flex-col">
        <div className={cn(
          "flex-1 min-h-[300px] p-4 rounded-lg border",
          "bg-muted/50"
        )}>
          {isTranslating && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          {!isTranslating && !error && primaryTranslation && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {targetLanguages.find(l => l.code === primaryTranslation.lang)?.name || primaryTranslation.lang}
                </span>
                <button
                  onClick={() => {
                    onCopy(getDisplayText(primaryTranslation), primaryTranslation.lang);
                    setLocalCopyStates(prev => ({ ...prev, [primaryTranslation.lang]: true }));
                    setTimeout(() => {
                      setLocalCopyStates(prev => ({ ...prev, [primaryTranslation.lang]: false }));
                    }, 2000);
                  }}
                  className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1"
                >
                  {(copyStates[primaryTranslation.lang] || localCopyStates[primaryTranslation.lang]) ? (
                    <><Check className="w-3 h-3" /> {UI_TEXT.labels.copied}</>
                  ) : (
                    <><Copy className="w-3 h-3" /> {UI_TEXT.buttons.copy}</>
                  )}
                </button>
              </div>
              <SelectableText
                text={getDisplayText(primaryTranslation)}
                type="output"
                lang={primaryTranslation.lang}
                isSelected={isSelected(`output-${primaryTranslation.lang}`)}
                selectionOrder={getSelectionOrder(`output-${primaryTranslation.lang}`)}
                onToggle={() => toggleSelection({
                  id: `output-${primaryTranslation.lang}`,
                  text: getDisplayText(primaryTranslation),
                  type: 'output',
                  lang: primaryTranslation.lang
                })}
              />
            </>
          )}
          {!isTranslating && !error && !primaryTranslation && text.trim() && (
            <div className="text-muted-foreground text-sm">
              {UI_TEXT.messages.noResults}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Translation Column - Only on large screens when there are 2+ languages */}
      {targetLanguages.length > 1 && (
        <div className="hidden lg:flex flex-col">
          <div className={cn(
            "flex-1 min-h-[300px] p-4 rounded-lg border",
            "bg-muted/50"
          )}>
            {isTranslating && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isTranslating && !error && secondaryTranslation && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {targetLanguages.find(l => l.code === secondaryTranslation.lang)?.name || secondaryTranslation.lang}
                  </span>
                  <button
                    onClick={() => {
                      onCopy(getDisplayText(secondaryTranslation), secondaryTranslation.lang);
                      setLocalCopyStates(prev => ({ ...prev, [secondaryTranslation.lang]: true }));
                      setTimeout(() => {
                        setLocalCopyStates(prev => ({ ...prev, [secondaryTranslation.lang]: false }));
                      }, 2000);
                    }}
                    className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    {(copyStates[secondaryTranslation.lang] || localCopyStates[secondaryTranslation.lang]) ? (
                      <><Check className="w-3 h-3" /> {UI_TEXT.labels.copied}</>
                    ) : (
                      <><Copy className="w-3 h-3" /> {UI_TEXT.buttons.copy}</>
                    )}
                  </button>
                </div>
                <SelectableText
                  text={getDisplayText(secondaryTranslation)}
                  type="output"
                  lang={secondaryTranslation.lang}
                  isSelected={isSelected(`output-${secondaryTranslation.lang}`)}
                  selectionOrder={getSelectionOrder(`output-${secondaryTranslation.lang}`)}
                  onToggle={() => toggleSelection({
                    id: `output-${secondaryTranslation.lang}`,
                    text: getDisplayText(secondaryTranslation),
                    type: 'output',
                    lang: secondaryTranslation.lang
                  })}
                />
              </>
            )}
            {!isTranslating && !error && !secondaryTranslation && text.trim() && (
              <div className="text-muted-foreground text-sm">
                {UI_TEXT.messages.noResults}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show remaining translations on tablet/mobile if more than 1 */}
      {targetLanguages.length > 1 && (
        <div className="lg:hidden col-span-full">
          {results?.translations.slice(1).map((translation, index) => (
            <div key={translation.lang} className={cn(
              "p-4 rounded-lg border mb-4",
              "bg-muted/50"
            )}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {targetLanguages.find(l => l.code === translation.lang)?.name || translation.lang}
                </span>
                <button
                  onClick={() => {
                    onCopy(getDisplayText(translation), translation.lang);
                    setLocalCopyStates(prev => ({ ...prev, [translation.lang]: true }));
                    setTimeout(() => {
                      setLocalCopyStates(prev => ({ ...prev, [translation.lang]: false }));
                    }, 2000);
                  }}
                  className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1"
                >
                  {(copyStates[translation.lang] || localCopyStates[translation.lang]) ? (
                    <><Check className="w-3 h-3" /> {UI_TEXT.labels.copied}</>
                  ) : (
                    <><Copy className="w-3 h-3" /> {UI_TEXT.buttons.copy}</>
                  )}
                </button>
              </div>
              <SelectableText
                text={getDisplayText(translation)}
                type="output"
                lang={translation.lang}
                isSelected={isSelected(`output-${translation.lang}`)}
                selectionOrder={getSelectionOrder(`output-${translation.lang}`)}
                onToggle={() => toggleSelection({
                  id: `output-${translation.lang}`,
                  text: getDisplayText(translation),
                  type: 'output',
                  lang: translation.lang
                })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}