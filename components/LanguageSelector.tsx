'use client'

import { Language } from '@/lib/types'
import { UNIFIED_LANGUAGES, PRIMARY_LANGUAGES } from '@/lib/constants'
import { UI_TEXT } from '@/lib/constants/uiText'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface LanguageSelectorProps {
  sourceLang: string
  targetLangs: string[]
  onSourceLangChange: (lang: string) => void
  onTargetLangChange: (langs: string[]) => void
  showMoreLangs: boolean
  onShowMoreChange: (show: boolean) => void
}

const MAX_TARGET_LANGUAGES = 2

export function LanguageSelector({
  sourceLang,
  targetLangs,
  onSourceLangChange,
  onTargetLangChange,
  showMoreLangs,
  onShowMoreChange
}: LanguageSelectorProps) {
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSourceDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTargetLangToggle = (langCode: string) => {
    if (targetLangs.includes(langCode)) {
      // Always allow deselection
      onTargetLangChange(targetLangs.filter(l => l !== langCode))
      setShowWarning(false)
    } else {
      // Check limit before adding
      if (targetLangs.length >= MAX_TARGET_LANGUAGES) {
        // Show warning instead of adding
        setShowWarning(true)
        // Auto-hide warning after 3 seconds
        setTimeout(() => setShowWarning(false), 3000)
        return
      }
      onTargetLangChange([...targetLangs, langCode])
    }
  }

  const getLanguageName = (code: string) => {
    if (code === 'auto') return UI_TEXT.placeholders.autoDetect
    return UNIFIED_LANGUAGES.find(lang => lang.code === code)?.name || code
  }

  // Split languages for display
  const primaryLanguageObjects = PRIMARY_LANGUAGES
    .map(code => UNIFIED_LANGUAGES.find(lang => lang.code === code))
    .filter((lang): lang is Language => lang !== undefined)
  
  const otherLanguages = UNIFIED_LANGUAGES.filter(
    lang => !PRIMARY_LANGUAGES.includes(lang.code)
  )

  return (
    <div className="w-full space-y-4">
      {/* Horizontal layout for desktop, vertical for mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* From Language Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {UI_TEXT.labels.from}
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
              className="w-full px-4 py-2 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span>{getLanguageName(sourceLang)}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isSourceDropdownOpen ? 'transform rotate-180' : ''}`} />
              </div>
            </button>
            
            {isSourceDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    onSourceLangChange('auto')
                    setIsSourceDropdownOpen(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    sourceLang === 'auto' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  {UI_TEXT.placeholders.autoDetect}
                </button>
                {UNIFIED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSourceLangChange(lang.code)
                      setIsSourceDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sourceLang === lang.code ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* To Languages Selector */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {UI_TEXT.labels.to}
            </label>
            <span className={cn(
              "text-sm px-2 py-1 rounded-full",
              targetLangs.length === MAX_TARGET_LANGUAGES 
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}>
              {targetLangs.length}/{MAX_TARGET_LANGUAGES} selected
            </span>
          </div>
          
          {/* Warning message */}
          {showWarning && (
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Maximum {MAX_TARGET_LANGUAGES} languages can be selected. Please deselect a language first.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {/* Primary Languages - Always Visible */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {primaryLanguageObjects.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleTargetLangToggle(lang.code)}
                  disabled={!targetLangs.includes(lang.code) && targetLangs.length >= MAX_TARGET_LANGUAGES}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    targetLangs.includes(lang.code)
                      ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                      : !targetLangs.includes(lang.code) && targetLangs.length >= MAX_TARGET_LANGUAGES
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 border border-gray-300 dark:border-gray-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                  )}
                >
                  {lang.name}
                  {!targetLangs.includes(lang.code) && targetLangs.length >= MAX_TARGET_LANGUAGES && (
                    <span className="ml-1 text-xs">(Max {MAX_TARGET_LANGUAGES})</span>
                  )}
                </button>
              ))}
            </div>

              {/* Visual Separator */}
              {otherLanguages.length > 0 && (
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <button
                      onClick={() => onShowMoreChange(!showMoreLangs)}
                      className="px-4 py-1 bg-white dark:bg-gray-900 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      {showMoreLangs ? UI_TEXT.buttons.showLess : `${UI_TEXT.buttons.showMore} (${otherLanguages.length})`}
                    </button>
                  </div>
                </div>
              )}

              {/* Other Languages - Collapsible */}
              {showMoreLangs && otherLanguages.length > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {otherLanguages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleTargetLangToggle(lang.code)}
                        disabled={!targetLangs.includes(lang.code) && targetLangs.length >= MAX_TARGET_LANGUAGES}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                          targetLangs.includes(lang.code)
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : !targetLangs.includes(lang.code) && targetLangs.length >= MAX_TARGET_LANGUAGES
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        )}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}