import { TranslationSet } from '@/types/mom';

interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLangs: string[];
  resolve: (value: TranslationSet) => void;
  reject: (reason?: any) => void;
  retryCount: number;
  timestamp: number;
}

interface BatchResult {
  success: boolean;
  data?: TranslationSet;
  error?: string;
}

class TranslationQueue {
  private queue: TranslationRequest[] = [];
  private processing = false;
  private rateLimitDelay = 1000; // 1 second between requests
  private maxRetries = 3;
  private batchSize = 5; // Process 5 translations at once
  private failedCount = 0;
  private lastError: string | null = null;
  
  async addToQueue(
    text: string,
    sourceLang: string = 'auto',
    targetLangs: string[] = ['en', 'ja', 'th']
  ): Promise<TranslationSet> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        text,
        sourceLang,
        targetLangs,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    // Process in batches
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const results = await this.processBatch(batch);
      
      // Resolve successful translations
      results.forEach((result, index) => {
        if (result.success && result.data) {
          batch[index].resolve(result.data);
        } else {
          this.handleFailedRequest(batch[index], result.error || 'Unknown error');
        }
      });
    } catch (error) {
      // Handle batch failure
      batch.forEach(request => {
        this.handleFailedRequest(request, error);
      });
    }
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    
    // Continue processing
    this.processQueue();
  }
  
  private async processBatch(batch: TranslationRequest[]): Promise<BatchResult[]> {
    // Process each translation request individually using the single API endpoint
    const results = await Promise.all(
      batch.map(async (req) => {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: req.text,
              sourceLang: req.sourceLang
            }),
            signal: AbortSignal.timeout(30000) // 30 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result.success && result.data) {
            return {
              success: true,
              data: result.data
            };
          } else {
            throw new Error(result.error || 'Translation failed');
          }
        } catch (error: any) {
          console.error('Individual translation error:', error);
          return {
            success: false,
            error: error.message || 'Translation failed'
          };
        }
      })
    );
    
    return results;
  }
  
  private handleFailedRequest(request: TranslationRequest, error: any) {
    request.retryCount++;
    this.lastError = error?.toString() || 'Unknown error';
    
    if (request.retryCount < this.maxRetries) {
      // Exponential backoff
      const delay = Math.pow(2, request.retryCount) * 1000;
      
      setTimeout(() => {
        this.queue.unshift(request); // Add back to front of queue
        if (!this.processing) {
          this.processQueue();
        }
      }, delay);
    } else {
      // Max retries reached
      this.failedCount++;
      request.reject(error);
    }
  }
  
  getPendingCount(): number {
    return this.queue.length;
  }
  
  getFailedCount(): number {
    return this.failedCount;
  }
  
  getLastError(): string | null {
    return this.lastError;
  }
  
  clearStats() {
    this.failedCount = 0;
    this.lastError = null;
  }
}

// Singleton instance
export const translationQueue = new TranslationQueue();