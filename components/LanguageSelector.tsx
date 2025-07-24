'use client'

import { Language } from '@/lib/types'
import { UNIFIED_LANGUAGES } from '@/lib/constants'
import { UI_TEXT } from '@/lib/constants/uiText'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface LanguageSelectorProps {
  sourceLang: string
  targetLangs: string[]
  onSourceLangChange: (lang: string) => void
  onTargetLangChange: (langs: string[]) => void
  showMoreLangs: boolean
  onShowMoreChange: (show: boolean) => void
}

export function LanguageSelector({
  sourceLang,
  targetLangs,
  onSourceLangChange,
  onTargetLangChange,
  showMoreLangs,
  onShowMoreChange
}: LanguageSelectorProps) {
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false)
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
      onTargetLangChange(targetLangs.filter(l => l !== langCode))
    } else {
      onTargetLangChange([...targetLangs, langCode])
    }
  }

  const getLanguageName = (code: string) => {
    if (code === 'auto') return UI_TEXT.placeholders.autoDetect
    return UNIFIED_LANGUAGES.find(lang => lang.code === code)?.name || code
  }

  // Split languages for display
  const priorityLanguages = UNIFIED_LANGUAGES.slice(0, 10)
  const otherLanguages = UNIFIED_LANGUAGES.slice(10)

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
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {UI_TEXT.labels.to}
          </label>
          <div className="space-y-2">
            {/* Priority Languages */}
            <div className="flex flex-wrap gap-2">
              {priorityLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleTargetLangToggle(lang.code)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    targetLangs.includes(lang.code)
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            {/* Show More/Less Toggle */}
            {otherLanguages.length > 0 && (
              <>
                <button
                  onClick={() => onShowMoreChange(!showMoreLangs)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  {showMoreLangs ? UI_TEXT.buttons.showLess : UI_TEXT.buttons.showMore}
                </button>

                {/* Other Languages */}
                {showMoreLangs && (
                  <div className="flex flex-wrap gap-2">
                    {otherLanguages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleTargetLangToggle(lang.code)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          targetLangs.includes(lang.code)
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}