'use client'

import { useState, useCallback, useEffect } from 'react'
import { Loader2, Copy, Check, Plus, X } from 'lucide-react'
import { TranslationResult, Language, TranslationMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UI_TEXT } from '@/lib/constants/uiText'
import { SelectableText } from '@/components/SelectableText'
import { useBulkCopy } from '@/lib/hooks/useBulkCopy'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { getLanguageByCode } from '@/lib/constants'
import { cleanSummaryText, validateSummaryFormat, addHierarchicalNumbering } from '@/lib/utils/summaryFormatter'
import { AutoResizingTextarea } from '@/components/AutoResizingTextarea'
import { useDebounceTranslation } from '@/lib/hooks/useDebounceTranslation'

interface InputBox {
  id: string
  text: string
}

interface MultiInputRealTimeLayoutProps {
  sourceLang: string
  targetLanguages: Language[]
  maxChars: number
  mode?: TranslationMode
  onCopy?: (text: string, lang: string) => void
}

const MAX_INPUT_BOXES = 5

export function MultiInputRealTimeLayout({
  sourceLang,
  targetLanguages,
  maxChars,
  mode = 'translate',
  onCopy
}: MultiInputRealTimeLayoutProps) {
  const [inputBoxes, setInputBoxes] = useState<InputBox[]>([
    { id: '1', text: '' }
  ])
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({})
  const [bulkCopyText, setBulkCopyText] = useState('')
  
  const {
    selectedItems,
    toggleSelection,
    copySelected,
    clearSelection,
    isSelected,
    getSelectionOrder
  } = useBulkCopy()

  // Add new input box
  const addInputBox = useCallback(() => {
    if (inputBoxes.length < MAX_INPUT_BOXES) {
      setInputBoxes(prev => [...prev, { 
        id: Date.now().toString(), 
        text: '' 
      }])
    }
  }, [inputBoxes.length])

  // Remove input box
  const removeInputBox = useCallback((id: string) => {
    setInputBoxes(prev => prev.filter(box => box.id !== id))
  }, [])

  // Update input text
  const updateInputText = useCallback((id: string, text: string) => {
    setInputBoxes(prev => prev.map(box => 
      box.id === id ? { ...box, text } : box
    ))
  }, [])

  // Handle copy
  const handleCopy = useCallback((text: string, identifier: string) => {
    if (onCopy) {
      onCopy(text, identifier)
    } else {
      navigator.clipboard.writeText(text)
    }
    setCopyStates(prev => ({ ...prev, [identifier]: true }))
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [identifier]: false }))
    }, 2000)
  }, [onCopy])

  // Handle bulk copy with proper ordering
  const handleBulkCopy = useCallback(() => {
    const textToCopy: string[] = []
    
    inputBoxes.forEach((inputBox, inputIndex) => {
      const inputKey = `input-${inputBox.id}`
      
      // Add input text if selected
      if (isSelected(inputKey)) {
        textToCopy.push(`[Input ${inputIndex + 1}]`)
        textToCopy.push(inputBox.text)
        textToCopy.push('')
      }
      
      // Add output texts if selected
      targetLanguages.forEach((lang, langIndex) => {
        const outputKey = `output-${inputBox.id}-${lang.code}`
        if (isSelected(outputKey)) {
          textToCopy.push(`[${lang.name} Translation ${inputIndex + 1}]`)
          // Get translation from the translation box component
          const translationBox = document.querySelector(`[data-translation-id="${outputKey}"]`)
          const translationText = translationBox?.textContent || ''
          textToCopy.push(translationText)
          textToCopy.push('')
        }
      })
    })
    
    copySelected()
    setBulkCopyText(UI_TEXT.labels.copied)
    setTimeout(() => setBulkCopyText(''), 2000)
  }, [inputBoxes, targetLanguages, isSelected, copySelected])

  // Helper to get display text based on mode
  const getDisplayText = (translation: { text: string; summary?: string[] } | null): string => {
    if (!translation) return ''
    
    if (mode === 'summarize' && translation.summary && Array.isArray(translation.summary)) {
      let summaryText = cleanSummaryText(translation.summary)
      
      if (!validateSummaryFormat(summaryText)) {
        summaryText = addHierarchicalNumbering(summaryText)
      }
      
      return summaryText
    }
    
    return translation.text
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {sourceLang && (
            <>
              {UI_TEXT.labels.sourceLanguage}: <span className="font-semibold text-foreground">{getLanguageByCode(sourceLang)?.name || sourceLang}</span>
            </>
          )}
        </p>
        
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

      {/* Input/Output Boxes */}
      {inputBoxes.map((inputBox, inputIndex) => (
        <div key={inputBox.id} className="border-b pb-6 last:border-b-0">
          {/* Input Box Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Input {inputIndex + 1}</h3>
              {inputBox.text.trim() && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected(`input-${inputBox.id}`)}
                    onCheckedChange={() => toggleSelection({ 
                      id: `input-${inputBox.id}`, 
                      text: inputBox.text, 
                      type: 'input',
                      sourceLanguage: sourceLang
                    })}
                    aria-label={`Select input ${inputIndex + 1} for copying`}
                  />
                  {isSelected(`input-${inputBox.id}`) && getSelectionOrder(`input-${inputBox.id}`) !== undefined && (
                    <span className="text-3xl font-extrabold text-primary">
                      {getSelectionOrder(`input-${inputBox.id}`)}
                    </span>
                  )}
                </div>
              )}
            </div>
            {inputIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeInputBox(inputBox.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Input and Output Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Input Column */}
            <div className="flex flex-col">
              <AutoResizingTextarea
                value={inputBox.text}
                onChange={(text) => updateInputText(inputBox.id, text)}
                placeholder={UI_TEXT.placeholders.inputText}
                maxChars={maxChars}
                isOverLimit={inputBox.text.length > maxChars}
                minHeight={100}
                maxHeight={400}
              />
            </div>

            {/* Translation Boxes */}
            {targetLanguages.map((lang, langIndex) => (
              <TranslationBox
                key={`${inputBox.id}-${lang.code}`}
                inputId={inputBox.id}
                inputText={inputBox.text}
                language={lang}
                sourceLang={sourceLang}
                mode={mode}
                isSelected={isSelected(`output-${inputBox.id}-${lang.code}`)}
                selectionOrder={getSelectionOrder(`output-${inputBox.id}-${lang.code}`)}
                onToggleSelection={() => toggleSelection({
                  id: `output-${inputBox.id}-${lang.code}`,
                  text: '', // Will be filled when translation is ready
                  type: 'output',
                  lang: lang.code
                })}
                onCopy={handleCopy}
                copyState={copyStates[`${inputBox.id}-${lang.code}`]}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Add Input Button */}
      {inputBoxes.length < MAX_INPUT_BOXES && (
        <Button
          onClick={addInputBox}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Input Box ({inputBoxes.length}/{MAX_INPUT_BOXES})
        </Button>
      )}
    </div>
  )
}

// Separate TranslationBox component to handle individual translations
interface TranslationBoxProps {
  inputId: string
  inputText: string
  language: Language
  sourceLang: string
  mode: TranslationMode
  isSelected: boolean
  selectionOrder?: number
  onToggleSelection: () => void
  onCopy: (text: string, identifier: string) => void
  copyState?: boolean
}

function TranslationBox({
  inputId,
  inputText,
  language,
  sourceLang,
  mode,
  isSelected,
  selectionOrder,
  onToggleSelection,
  onCopy,
  copyState
}: TranslationBoxProps) {
  const { results, isTranslating, error } = useDebounceTranslation({
    text: inputText,
    sourceLang,
    targetLangs: [language.code],
    mode,
    enabled: !!inputText.trim(),
    delay: 1000
  })

  const translation = results?.translations?.[0]
  const displayText = translation ? getDisplayText(translation) : ''

  // Helper to get display text based on mode
  function getDisplayText(translation: { text: string; summary?: string[] } | null): string {
    if (!translation) return ''
    
    if (mode === 'summarize' && translation.summary && Array.isArray(translation.summary)) {
      let summaryText = cleanSummaryText(translation.summary)
      
      if (!validateSummaryFormat(summaryText)) {
        summaryText = addHierarchicalNumbering(summaryText)
      }
      
      return summaryText
    }
    
    return translation.text
  }

  // Update selection with actual text when translation is ready
  useEffect(() => {
    if (translation && displayText && isSelected) {
      // Update the selection with the actual translated text
      const event = new CustomEvent('updateSelectionText', {
        detail: {
          id: `output-${inputId}-${language.code}`,
          text: displayText
        }
      })
      window.dispatchEvent(event)
    }
  }, [translation, displayText, isSelected, inputId, language.code])

  return (
    <div className="flex flex-col">
      <div 
        className={cn(
          "flex-1 min-h-[100px] max-h-[400px] p-4 rounded-lg border",
          "bg-muted/50",
          "overflow-y-auto",
          "break-words",
          "real-time-output"
        )}
        data-translation-id={`output-${inputId}-${language.code}`}
      >
        {isTranslating && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        {!isTranslating && !error && translation && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {language.name}
              </span>
              <button
                onClick={() => onCopy(displayText, `${inputId}-${language.code}`)}
                className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1"
              >
                {copyState ? (
                  <><Check className="w-3 h-3" /> {UI_TEXT.labels.copied}</>
                ) : (
                  <><Copy className="w-3 h-3" /> {UI_TEXT.buttons.copy}</>
                )}
              </button>
            </div>
            <SelectableText
              text={displayText}
              type="output"
              lang={language.code}
              isSelected={isSelected}
              selectionOrder={selectionOrder}
              onToggle={onToggleSelection}
            />
          </>
        )}
        {!isTranslating && !error && !translation && inputText.trim() && (
          <div className="text-muted-foreground text-sm">
            {UI_TEXT.messages.noResults}
          </div>
        )}
      </div>
    </div>
  )
}