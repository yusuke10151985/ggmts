'use client';

import { useEffect } from 'react';
import logger from '@/lib/mom/client-logger';

export function useClientLogger(componentName: string) {
  useEffect(() => {
    if (!logger) return;
    
    logger.debug(componentName, `Component mounted`);
    
    return () => {
      logger.debug(componentName, `Component unmounted`);
    };
  }, [componentName]);

  return {
    log: (message: string, data?: any) => {
      if (logger) logger.log(componentName, message, data);
    },
    error: (message: string, data?: any) => {
      if (logger) logger.error(componentName, message, data);
    },
    warn: (message: string, data?: any) => {
      if (logger) logger.warn(componentName, message, data);
    },
    debug: (message: string, data?: any) => {
      if (logger) logger.debug(componentName, message, data);
    }
  };
}