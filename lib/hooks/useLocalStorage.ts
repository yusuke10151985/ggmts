"use client"

import { useState, useEffect } from 'react';

function getValue<T,>(key: string, initialValue: T | (() => T)): T {
  if (typeof window === 'undefined') {
    return initialValue instanceof Function ? initialValue() : initialValue;
  }
  
  const savedValue = localStorage.getItem(key);
  if (savedValue !== null) {
    try {
      return JSON.parse(savedValue);
    } catch {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  }

  return initialValue instanceof Function ? initialValue() : initialValue;
}

export function useLocalStorage<T,>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize with a function to ensure consistent behavior
  const [value, setValue] = useState<T>(() => {
    // During SSR, always return the initial value
    if (typeof window === 'undefined') {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
    return getValue(key, initialValue);
  });

  // Track if we're mounted to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value, isMounted]);

  // Return initial value during SSR and first render, then actual value after mount
  const displayValue = isMounted ? value : (initialValue instanceof Function ? initialValue() : initialValue);

  return [displayValue, setValue];
} 