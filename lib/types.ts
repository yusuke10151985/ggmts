export interface Language {
  code: string;
  name: string;
}

export interface Translation {
  lang: string;
  text: string;
  summary?: any[];
}

export interface TranslationResult {
  sourceLanguage: string;
  translations: Translation[];
}

export type TranslationMode = 'translate' | 'summarize' | 'generate';

export interface HistoryItem {
  id: string;
  inputText: string;
  sourceLang: string;
  targetLangs: string[];
  result: TranslationResult;
  timestamp: string;
  mode: TranslationMode;
} 