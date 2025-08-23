/**
 * Client-side logger for debugging MOM display issues
 * Especially for Windows environment debugging
 */

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  component: string;
  message: string;
  data?: any;
  userAgent: string;
  platform: string;
}

class ClientLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private isWindows: boolean;
  private debugMode: boolean = false;

  constructor() {
    // Detect Windows
    this.isWindows = typeof window !== 'undefined' && 
      (navigator.platform.indexOf('Win') !== -1 || 
       navigator.userAgent.indexOf('Windows') !== -1);
    
    // Enable debug mode for Windows or if URL has ?debug=true
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      this.debugMode = this.isWindows || urlParams.get('debug') === 'true';
      
      if (this.debugMode) {
        console.log('%c🔍 MOM Debug Mode Enabled', 'background: #ff0; color: #000; padding: 5px;');
        console.log('Platform:', navigator.platform);
        console.log('User Agent:', navigator.userAgent);
      }
    }

    // Intercept console methods
    this.interceptConsole();
    
    // Listen for errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Window', `Uncaught error: ${event.message}`, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Window', `Unhandled promise rejection: ${event.reason}`, {
          reason: event.reason,
          promise: event.promise
        });
      });
    }
  }

  private interceptConsole() {
    if (typeof window === 'undefined') return;

    try {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      // Override console.log
      console.log = (...args) => {
        originalLog.apply(console, args);
        try {
          if (args[0]?.toString().includes('[') || this.debugMode) {
            this.log('Console', args.join(' '), { args });
          }
        } catch (e) {
          // Ignore logging errors
        }
      };

      // Override console.error
      console.error = (...args) => {
        originalError.apply(console, args);
        try {
          this.error('Console', args.join(' '), { args });
        } catch (e) {
          // Ignore logging errors
        }
      };

      // Override console.warn
      console.warn = (...args) => {
        originalWarn.apply(console, args);
        try {
          this.warn('Console', args.join(' '), { args });
        } catch (e) {
          // Ignore logging errors
        }
      };
    } catch (error) {
      console.error('Failed to intercept console:', error);
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Store in sessionStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('mom_debug_logs', JSON.stringify(this.logs));
      } catch (e) {
        // Ignore storage errors
      }
    }

    // Auto-send logs to server if there's an error on Windows
    if (this.isWindows && entry.level === 'error') {
      this.sendLogsToServer();
    }
  }

  log(component: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      component,
      message,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : ''
    };

    this.addLog(entry);

    if (this.debugMode) {
      console.log(`%c[${component}]`, 'color: #0066cc', message, data || '');
    }
  }

  warn(component: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      component,
      message,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : ''
    };

    this.addLog(entry);

    if (this.debugMode) {
      console.warn(`%c[${component}]`, 'color: #ff9900', message, data || '');
    }
  }

  error(component: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      component,
      message,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : ''
    };

    this.addLog(entry);

    if (this.debugMode || entry.level === 'error') {
      console.error(`%c[${component}]`, 'color: #ff0000', message, data || '');
    }
  }

  debug(component: string, message: string, data?: any) {
    if (!this.debugMode) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      component,
      message,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : ''
    };

    this.addLog(entry);
    console.log(`%c[DEBUG ${component}]`, 'background: #333; color: #0f0', message, data || '');
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mom_debug_logs');
    }
  }

  async sendLogsToServer() {
    if (typeof window === 'undefined') return;

    try {
      const response = await fetch('/api/mom/debug/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: this.logs,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          platform: navigator.platform,
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        console.log('%c📤 Debug logs sent to server', 'color: #00ff00');
      }
    } catch (error) {
      console.error('Failed to send logs to server:', error);
    }
  }

  downloadLogs() {
    if (typeof window === 'undefined') return;

    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `mom-debug-logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  showDebugPanel() {
    if (typeof window === 'undefined') return;

    // Check if panel already exists
    if (document.getElementById('mom-debug-panel')) {
      document.getElementById('mom-debug-panel')?.remove();
      return;
    }

    // Create debug panel
    const panel = document.createElement('div');
    panel.id = 'mom-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 600px;
      max-height: 400px;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 9999;
      font-family: monospace;
      font-size: 12px;
    `;

    panel.innerHTML = `
      <div style="background: #333; color: white; padding: 10px; border-radius: 6px 6px 0 0;">
        <strong>🔍 MOM Debug Panel</strong>
        <button onclick="window.momLogger.clearLogs()" style="float: right; margin-left: 10px;">Clear</button>
        <button onclick="window.momLogger.downloadLogs()" style="float: right; margin-left: 10px;">Download</button>
        <button onclick="window.momLogger.sendLogsToServer()" style="float: right; margin-left: 10px;">Send to Server</button>
        <button onclick="document.getElementById('mom-debug-panel').remove()" style="float: right;">×</button>
      </div>
      <div style="padding: 10px; overflow-y: auto; max-height: 350px;" id="debug-log-content">
        ${this.logs.map(log => `
          <div style="margin-bottom: 5px; padding: 5px; background: ${
            log.level === 'error' ? '#ffeeee' : 
            log.level === 'warn' ? '#fff5ee' : 
            log.level === 'debug' ? '#f0f0f0' : 
            '#f9f9f9'
          }; border-left: 3px solid ${
            log.level === 'error' ? '#ff0000' : 
            log.level === 'warn' ? '#ff9900' : 
            log.level === 'debug' ? '#666' : 
            '#0066cc'
          };">
            <strong>[${log.timestamp.split('T')[1].split('.')[0]}] ${log.component}</strong><br/>
            ${log.message}
            ${log.data ? `<br/><pre style="margin: 5px 0; font-size: 10px;">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
          </div>
        `).reverse().join('')}
      </div>
    `;

    document.body.appendChild(panel);

    // Auto-refresh logs
    setInterval(() => {
      const content = document.getElementById('debug-log-content');
      if (content) {
        content.innerHTML = this.logs.map(log => `
          <div style="margin-bottom: 5px; padding: 5px; background: ${
            log.level === 'error' ? '#ffeeee' : 
            log.level === 'warn' ? '#fff5ee' : 
            log.level === 'debug' ? '#f0f0f0' : 
            '#f9f9f9'
          }; border-left: 3px solid ${
            log.level === 'error' ? '#ff0000' : 
            log.level === 'warn' ? '#ff9900' : 
            log.level === 'debug' ? '#666' : 
            '#0066cc'
          };">
            <strong>[${log.timestamp.split('T')[1].split('.')[0]}] ${log.component}</strong><br/>
            ${log.message}
            ${log.data ? `<br/><pre style="margin: 5px 0; font-size: 10px;">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
          </div>
        `).reverse().join('');
      }
    }, 1000);
  }
}

// Create singleton instance with error handling
let logger: ClientLogger | null = null;

try {
  if (typeof window !== 'undefined') {
    logger = new ClientLogger();
    // Make available globally for debugging
    (window as any).momLogger = logger;
  }
} catch (error) {
  console.error('Failed to initialize ClientLogger:', error);
}

// Export for use in components
export default logger;