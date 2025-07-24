'use client'

import { useEffect, useState } from 'react'
import { Loader2, Copy, Check } from 'lucide-react'
import { TranslationResult, Language } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UI_TEXT } from '@/lib/constants/uiText'
import { SelectableText } from '@/components/SelectableText'
import { useBulkCopy } from '@/lib/hooks/useBulkCopy'
import { Button } from '@/components/ui/button'

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
}: RealTimeTranslationLayoutProps) {
  const [primaryTranslation, setPrimaryTranslation] = useState<{ lang: string; text: string } | null>(null)
  const [secondaryTranslation, setSecondaryTranslation] = useState<{ lang: string; text: string } | null>(null)
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

  return (
    <>
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
        
        {/* Input text selection checkbox */}
        {text.trim() && (
          <div className="mt-2">
            <SelectableText
              text={text}
              type="input"
              isSelected={isSelected('input')}
              selectionOrder={getSelectionOrder('input')}
              onToggle={() => toggleSelection({ 
                id: 'input', 
                text, 
                type: 'input',
                sourceLanguage: sourceLanguage || results?.sourceLanguage
              })}
            />
          </div>
        )}
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
                    onCopy(primaryTranslation.text, primaryTranslation.lang);
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
                text={primaryTranslation.text}
                type="output"
                lang={primaryTranslation.lang}
                isSelected={isSelected(`output-${primaryTranslation.lang}`)}
                selectionOrder={getSelectionOrder(`output-${primaryTranslation.lang}`)}
                onToggle={() => toggleSelection({
                  id: `output-${primaryTranslation.lang}`,
                  text: primaryTranslation.text,
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
                      onCopy(secondaryTranslation.text, secondaryTranslation.lang);
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
                  text={secondaryTranslation.text}
                  type="output"
                  lang={secondaryTranslation.lang}
                  isSelected={isSelected(`output-${secondaryTranslation.lang}`)}
                  selectionOrder={getSelectionOrder(`output-${secondaryTranslation.lang}`)}
                  onToggle={() => toggleSelection({
                    id: `output-${secondaryTranslation.lang}`,
                    text: secondaryTranslation.text,
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
                    onCopy(translation.text, translation.lang);
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
                text={translation.text}
                type="output"
                lang={translation.lang}
                isSelected={isSelected(`output-${translation.lang}`)}
                selectionOrder={getSelectionOrder(`output-${translation.lang}`)}
                onToggle={() => toggleSelection({
                  id: `output-${translation.lang}`,
                  text: translation.text,
                  type: 'output',
                  lang: translation.lang
                })}
              />
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Bulk Copy Controls */}
    {selectedItems.length > 0 && (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedItems.length} {UI_TEXT.labels.selected || 'selected'}
        </span>
        <Button
          onClick={handleBulkCopy}
          size="sm"
          disabled={selectedItems.length === 0}
        >
          {bulkCopyText || UI_TEXT.buttons.copySelected}
        </Button>
        <Button
          onClick={clearSelection}
          size="sm"
          variant="outline"
        >
          {UI_TEXT.buttons.clear}
        </Button>
      </div>
    )}
    </>
  )
}