interface TranslationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errors: Map<string, number>;
  lastUpdateTime: number;
}

class TranslationMonitor {
  private metrics: TranslationMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errors: new Map<string, number>(),
    lastUpdateTime: Date.now()
  };
  
  private responseTimeSamples: number[] = [];
  private maxSamples = 100; // Keep last 100 samples for average calculation
  
  logRequest(duration: number, success: boolean, error?: string) {
    this.metrics.totalRequests++;
    this.metrics.lastUpdateTime = Date.now();
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      if (error) {
        const count = this.metrics.errors.get(error) || 0;
        this.metrics.errors.set(error, count + 1);
      }
    }
    
    // Update response time samples
    this.responseTimeSamples.push(duration);
    if (this.responseTimeSamples.length > this.maxSamples) {
      this.responseTimeSamples.shift();
    }
    
    // Calculate new average
    this.metrics.averageResponseTime = 
      this.responseTimeSamples.reduce((sum, time) => sum + time, 0) / 
      this.responseTimeSamples.length;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Translation metrics:', this.getMetrics());
    }
  }
  
  getMetrics() {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
      : '0%';
    
    const topErrors = Array.from(this.metrics.errors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
    
    return {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      successRate,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      topErrors,
      lastUpdateTime: this.metrics.lastUpdateTime
    };
  }
  
  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errors: new Map<string, number>(),
      lastUpdateTime: Date.now()
    };
    this.responseTimeSamples = [];
  }
  
  // Export metrics for monitoring dashboard
  exportMetrics() {
    return {
      ...this.getMetrics(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
  }
}

export const translationMonitor = new TranslationMonitor();