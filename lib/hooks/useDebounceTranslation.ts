'use client'

import { useEffect, useRef, useState } from 'react'
import { TranslationMode, TranslationResult } from '@/lib/types'

interface UseDebounceTranslationProps {
  text: string
  sourceLang: string
  targetLangs: string[]
  mode: TranslationMode
  enabled: boolean
  delay?: number
}

interface UseDebounceTranslationReturn {
  results: TranslationResult | null
  isTranslating: boolean
  error: string | null
}

export function useDebounceTranslation({
  text,
  sourceLang,
  targetLangs,
  mode,
  enabled,
  delay = 1000,
}: UseDebounceTranslationProps): UseDebounceTranslationReturn {
  const [results, setResults] = useState<TranslationResult | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !text.trim() || targetLangs.length === 0) {
      setResults(null)
      setError(null)
      return
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      setIsTranslating(true)
      setError(null)

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            sourceLang,
            targetLangs,
            mode,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Translation failed')
        }

        const data = await response.json()
        setResults(data)
      } catch (err) {
        if (err instanceof Error) {
          if (err.name !== 'AbortError') {
            setError(err.message)
          }
        } else {
          setError('An unexpected error occurred')
        }
      } finally {
        setIsTranslating(false)
      }
    }, delay)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [text, sourceLang, targetLangs, mode, enabled, delay])

  return { results, isTranslating, error }
}