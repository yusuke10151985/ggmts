'use client';

import { useEffect } from 'react';
import logger from '@/lib/mom/client-logger';

export function useClientLogger(componentName: string) {
  useEffect(() => {
    try {
      if (!logger) return;
      
      logger.debug(componentName, `Component mounted`);
      
      return () => {
        try {
          if (logger) {
            logger.debug(componentName, `Component unmounted`);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    } catch (e) {
      // Ignore mount errors
      console.warn(`Failed to initialize logger for ${componentName}`);
    }
  }, [componentName]);

  return {
    log: (message: string, data?: any) => {
      try {
        if (logger) logger.log(componentName, message, data);
      } catch (e) {
        console.log(`[${componentName}]`, message, data);
      }
    },
    error: (message: string, data?: any) => {
      try {
        if (logger) logger.error(componentName, message, data);
      } catch (e) {
        console.error(`[${componentName}]`, message, data);
      }
    },
    warn: (message: string, data?: any) => {
      try {
        if (logger) logger.warn(componentName, message, data);
      } catch (e) {
        console.warn(`[${componentName}]`, message, data);
      }
    },
    debug: (message: string, data?: any) => {
      try {
        if (logger) logger.debug(componentName, message, data);
      } catch (e) {
        // Debug messages can be silently ignored
      }
    }
  };
}