'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { TranslationResult, Language } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RealTimeTranslationLayoutProps {
  text: string
  onTextChange: (text: string) => void
  results: TranslationResult | null
  isTranslating: boolean
  error: string | null
  maxChars: number
  targetLanguages: Language[]
  onCopy: (text: string, lang: string) => void
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
}: RealTimeTranslationLayoutProps) {
  const [primaryTranslation, setPrimaryTranslation] = useState<{ lang: string; text: string } | null>(null)
  const [secondaryTranslation, setSecondaryTranslation] = useState<{ lang: string; text: string } | null>(null)

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Input Column */}
      <div className="flex flex-col">
        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="翻訳したいテキストを入力..."
            className={cn(
              "w-full h-full min-h-[300px] p-4 rounded-lg border resize-none",
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
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {targetLanguages.find(l => l.code === primaryTranslation.lang)?.name || primaryTranslation.lang}
                </span>
                <button
                  onClick={() => onCopy(primaryTranslation.text, primaryTranslation.lang)}
                  className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
                >
                  コピー
                </button>
              </div>
              <div className="whitespace-pre-wrap">{primaryTranslation.text}</div>
            </div>
          )}
          {!isTranslating && !error && !primaryTranslation && text.trim() && (
            <div className="text-muted-foreground text-sm">
              翻訳結果がここに表示されます
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
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {targetLanguages.find(l => l.code === secondaryTranslation.lang)?.name || secondaryTranslation.lang}
                  </span>
                  <button
                    onClick={() => onCopy(secondaryTranslation.text, secondaryTranslation.lang)}
                    className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
                  >
                    コピー
                  </button>
                </div>
                <div className="whitespace-pre-wrap">{secondaryTranslation.text}</div>
              </div>
            )}
            {!isTranslating && !error && !secondaryTranslation && text.trim() && (
              <div className="text-muted-foreground text-sm">
                翻訳結果がここに表示されます
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
                  onClick={() => onCopy(translation.text, translation.lang)}
                  className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
                >
                  コピー
                </button>
              </div>
              <div className="whitespace-pre-wrap">{translation.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}