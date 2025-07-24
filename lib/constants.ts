import { Language } from './types';

// The master list of all languages, single source of truth.
const allLanguages: Language[] = [
  { code: 'ar', name: '🇸🇦 Arabic (العربية)' },
  { code: 'my', name: '🇲🇲 Burmese (မြန်မာဘာသာ)' },
  { code: 'zh', name: '🇨🇳 Chinese (简体中文)' },
  { code: 'nl', name: '🇳🇱 Dutch (Nederlands)' },
  { code: 'en', name: '🇺🇸🇬🇧 English (English)' },
  { code: 'tl', name: '🇵🇭 Filipino (Tagalog)' },
  { code: 'fr', name: '🇫🇷 French (Français)' },
  { code: 'de', name: '🇩🇪 German (Deutsch)' },
  { code: 'hi', name: '🇮🇳 Hindi (हिन्दी)' },
  { code: 'id', name: '🇮🇩 Indonesian (Bahasa Indonesia)' },
  { code: 'it', name: '🇮🇹 Italian (Italiano)' },
  { code: 'ja', name: '🇯🇵 Japanese (日本語)' },
  { code: 'km', name: '🇰🇭 Khmer (ភាសាខ្មែរ)' },
  { code: 'ko', name: '🇰🇷 Korean (한국어)' },
  { code: 'lo', name: '🇱🇦 Lao (ພາສາລາວ)' },
  { code: 'ms', name: '🇲🇾 Malay (Bahasa Melayu)' },
  { code: 'pt', name: '🇵🇹 Portuguese (Português)' },
  { code: 'ru', name: '🇷🇺 Russian (Русский)' },
  { code: 'es', name: '🇪🇸 Spanish (Español)' },
  { code: 'sv', name: '🇸🇪 Swedish (Svenska)' },
  { code: 'th', name: '🇹🇭 Thai (ภาษาไทย)' },
  { code: 'vi', name: '🇻🇳 Vietnamese (Tiếng Việt)' },
];

const languageMap = new Map(allLanguages.map(lang => [lang.code, lang]));

// Helper function for efficient lookup by language code.
export const getLanguageByCode = (code: string): Language | undefined => languageMap.get(code);

// --- Configuration for "To" language buttons ---
const priorityButtonCodes = ['en', 'ja', 'th', 'id', 'ms', 'tl', 'vi', 'my', 'km', 'lo'];

export const PRIORITY_LANGUAGES: Language[] = priorityButtonCodes
  .map(code => getLanguageByCode(code))
  .filter((lang): lang is Language => lang !== undefined);

export const OTHER_LANGUAGES: Language[] = allLanguages
  .filter(lang => !priorityButtonCodes.includes(lang.code))
  .sort((a, b) => a.name.localeCompare(b.name));

// --- Configuration for the "From" language dropdown ---
// A custom sorted list for the "From" dropdown menu.
const fromPriorityCodes = ['en', 'ja', 'th', 'id', 'ms', 'tl', 'vi', 'my', 'km', 'lo'];
const fromPriorityLangs = fromPriorityCodes
  .map(code => getLanguageByCode(code))
  .filter((lang): lang is Language => lang !== undefined);
const fromOtherLangs = allLanguages
  .filter(lang => !fromPriorityCodes.includes(lang.code))
  .sort((a, b) => a.name.localeCompare(b.name));

export const FROM_LANGUAGES: Language[] = [...fromPriorityLangs, ...fromOtherLangs];

// A simple alphabetically sorted list for general purposes.
export const SUPPORTED_LANGUAGES: Language[] = [...allLanguages].sort((a, b) => a.name.localeCompare(b.name));

// Use the same language list for both From and To selectors to ensure consistency
export const UNIFIED_LANGUAGES: Language[] = FROM_LANGUAGES;

// Default target languages
export const DEFAULT_TARGET_LANGUAGES = ['en', 'th'];

// Primary languages (always visible in To selection)
export const PRIMARY_LANGUAGES = ['en', 'ja', 'th']; 