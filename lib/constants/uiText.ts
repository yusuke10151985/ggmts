export const UI_TEXT = {
  modes: {
    normal: 'Normal Mode',
    realtime: 'Real-time Mode',
    translate: 'Translate',
    summarize: 'Summarize',
    generate: 'Generate for SNS'
  },
  buttons: {
    translate: 'Translate',
    summarize: 'Summarize',
    generate: 'Generate',
    copy: 'Copy',
    clear: 'Clear',
    copyAll: 'Copy All',
    copySelected: 'Copy Selected',
    reset: 'Reset',
    showMore: 'Show More',
    showLess: 'Show Less',
    execute: 'Execute',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    upgrade: 'Upgrade'
  },
  placeholders: {
    inputText: 'Enter text to translate...',
    inputSummarize: 'Enter text to summarize...',
    inputGenerate: 'Enter keywords for SNS content...',
    selectLanguage: 'Select language',
    autoDetect: 'Auto Detect'
  },
  labels: {
    from: 'From',
    to: 'To',
    outputLanguages: 'Output Languages',
    sourceLanguage: 'Source Language',
    targetLanguages: 'Target Languages',
    characterCount: 'Characters',
    history: 'History',
    results: 'Results',
    loading: 'Loading...',
    copied: 'Copied!',
    copyToClipboard: 'Copy to clipboard',
    noHistory: 'No translation history',
    clearHistory: 'Clear History',
    usage: 'Usage',
    usageLimit: 'Daily Limit',
    freeAccount: 'Free Account',
    proAccount: 'Pro Account',
    premierAccount: 'Premier Account',
    specialAccount: 'Special Account',
    adminAccount: 'Admin',
    title: 'Title',
    description: 'Description',
    content: 'Content',
    tags: 'Tags'
  },
  messages: {
    selectTargetLanguage: 'Please select at least one target language',
    enterText: 'Please enter text to translate',
    enterKeyword: 'Please enter keywords for generation',
    translationFailed: 'Translation failed. Please try again.',
    characterLimit: 'Character limit exceeded',
    characterLimitMessage: 'The limit for {mode} mode is {limit} characters. Current: {current}',
    noResults: 'No results to display',
    noSnsContent: 'No SNS content available.',
    noSummary: 'No summary available.',
    signInRequired: 'Please sign in to continue',
    dailyLimitReached: 'Daily usage limit reached',
    upgradePrompt: 'Upgrade to Pro for more translations'
  },
  history: {
    title: 'Translation History',
    load: 'Load',
    delete: 'Delete',
    clear: 'Clear All',
    empty: 'No history available',
    timestamp: 'Time'
  },
  snsButtons: {
    youtube: 'YouTube',
    x: 'X (Twitter)',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    share: 'Share',
    copyUrl: 'Copy URL'
  },
  tooltips: {
    copyText: 'Click to copy',
    selectForCopy: 'Click to select for bulk copy',
    selectedOrder: 'Selected #{number}',
    resetSelection: 'Reset selection',
    toggleHistory: 'Toggle history',
    toggleMode: 'Toggle translation mode'
  },
  template: {
    place: 'Place',
    whatToDo: 'What to do',
    feeling: 'Feeling',
    withWho: 'With who',
    special: 'Special',
    tips: 'Tips',
    time: 'Time',
    examples: {
      place: 'e.g. Ishigaki Island, Okinawa',
      whatToDo: 'e.g. Snorkeling with colorful fish',
      feeling: 'e.g. Like another world – so peaceful and healing',
      withWho: 'e.g. With my best friend',
      special: 'e.g. Spotted a rare blue starfish for the first time!',
      tips: 'e.g. Morning is best for clear water and calm waves',
      time: 'e.g. Visited in October – perfect weather!'
    }
  }
} as const