import { TranslationSet } from '@/types/mom';
import { translationQueue } from './translationQueue';

interface TranslationServiceConfig {
  maxTextLength: number;
  enableCache: boolean;
  fallbackToOriginal: boolean;
  cacheExpiryMs: number;
}

interface CacheEntry {
  translations: TranslationSet;
  timestamp: number;
}

class TranslationService {
  private cache = new Map<string, CacheEntry>();
  private config: TranslationServiceConfig;
  
  constructor(config: Partial<TranslationServiceConfig> = {}) {
    this.config = {
      maxTextLength: 5000,
      enableCache: true,
      fallbackToOriginal: true,
      cacheExpiryMs: 15 * 60 * 1000, // 15 minutes
      ...config
    };
    
    // Clean up expired cache entries periodically
    setInterval(() => this.cleanExpiredCache(), 60000); // Every minute
  }
  
  async translate(
    text: string,
    sourceLang: string = 'auto'
  ): Promise<TranslationSet> {
    // Input validation
    if (!text || text.trim().length === 0) {
      return { en: '', ja: '', th: '' };
    }
    
    // Skip cache for now to ensure fresh translations
    // const cacheKey = `${text}_${sourceLang}`;
    // if (this.config.enableCache) {
    //   const cached = this.getFromCache(cacheKey);
    //   if (cached) {
    //     return cached;
    //   }
    // }
    
    // Text length check
    if (text.length > this.config.maxTextLength) {
      // Split and translate in chunks
      return this.translateLongText(text, sourceLang);
    }
    
    try {
      // Add to queue instead of direct API call
      const result = await translationQueue.addToQueue(text, sourceLang);
      
      // Cache the result
      // if (this.config.enableCache) {
      //   this.addToCache(cacheKey, result);
      // }
      
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      
      // Fallback strategies
      return this.handleTranslationError(text, sourceLang, error);
    }
  }
  
  private async translateLongText(
    text: string,
    sourceLang: string
  ): Promise<TranslationSet> {
    // Split text into chunks
    const chunks = this.splitTextIntoChunks(text, 1000); // 1000 chars per chunk
    
    try {
      // Translate each chunk
      const translatedChunks = await Promise.all(
        chunks.map(chunk => this.translate(chunk, sourceLang))
      );
      
      // Combine results
      return {
        en: translatedChunks.map(t => t.en).join(' '),
        ja: translatedChunks.map(t => t.ja).join(' '),
        th: translatedChunks.map(t => t.th).join(' ')
      };
    } catch (error) {
      return this.handleTranslationError(text, sourceLang, error);
    }
  }
  
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    
    // Try to split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If a single sentence is too long, split it by words
        if (sentence.length > maxLength) {
          const words = sentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 > maxLength) {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
                wordChunk = '';
              }
            }
            wordChunk += word + ' ';
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence + ' ';
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  private handleTranslationError(
    text: string,
    sourceLang: string,
    error: any
  ): TranslationSet {
    // Log error for monitoring
    console.error('Translation fallback triggered:', {
      text: text.substring(0, 100),
      sourceLang,
      error: error?.message || error
    });
    
    // Check for cached partial matches
    const partialCache = this.findPartialCacheMatch(text);
    if (partialCache) {
      return partialCache;
    }
    
    // Fallback to original text if enabled
    if (this.config.fallbackToOriginal) {
      return {
        en: text,
        ja: text,
        th: text
      };
    }
    
    // Return error placeholders
    return {
      en: '[Translation Error]',
      ja: '[翻訳エラー]',
      th: '[ข้อผิดพลาดในการแปล]'
    };
  }
  
  private getFromCache(key: string): TranslationSet | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.config.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.translations;
  }
  
  private addToCache(key: string, translations: TranslationSet) {
    this.cache.set(key, {
      translations,
      timestamp: Date.now()
    });
  }
  
  private cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheExpiryMs) {
        this.cache.delete(key);
      }
    }
  }
  
  private findPartialCacheMatch(text: string): TranslationSet | null {
    // Look for similar cached translations
    for (const [key, entry] of this.cache.entries()) {
      const cachedText = key.split('_')[0];
      if (this.calculateSimilarity(text, cachedText) > 0.8) {
        return entry.translations;
      }
    }
    return null;
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using Jaccard index
    const set1 = new Set(str1.toLowerCase().split(' '));
    const set2 = new Set(str2.toLowerCase().split(' '));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  // Clear cache method for testing or manual cleanup
  clearCache() {
    this.cache.clear();
  }
  
  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key: key.substring(0, 50) + '...',
        age: Date.now() - entry.timestamp
      }))
    };
  }
}

// Initialize service with environment-based configuration
export const translationService = new TranslationService({
  maxTextLength: parseInt(process.env.NEXT_PUBLIC_TRANSLATION_MAX_LENGTH || '5000'),
  enableCache: process.env.NEXT_PUBLIC_TRANSLATION_CACHE !== 'false',
  fallbackToOriginal: true,
  cacheExpiryMs: 15 * 60 * 1000 // 15 minutes
});