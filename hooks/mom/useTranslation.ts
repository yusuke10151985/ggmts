import { useState, useCallback } from 'react';
import { TranslationSet } from '@/types';
import { translationService } from '@/services/translationService';

interface UseTranslationReturn {
  translate: (text: string, sourceLang?: string) => Promise<TranslationSet | null>;
  isTranslating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useTranslation(): UseTranslationReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const translate = useCallback(async (
    text: string,
    sourceLang?: string
  ): Promise<TranslationSet | null> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translationService.translate(text, sourceLang);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Translation failed';
      setError(errorMessage);
      console.error('Translation error:', err);
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return { translate, isTranslating, error, clearError };
}