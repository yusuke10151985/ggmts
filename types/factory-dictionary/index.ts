export enum Language {
  EN = 'en',
  JA = 'ja',
  TH = 'th',
}

export enum Category {
  Safety = 'safety',
  Machinery = 'machinery',
  Quality = 'quality',
  Tools = 'tools',
  Materials = 'materials',
  General = 'general',
}

export interface UsageExample {
  japanese: string
  english: string
  thai: string
}

export interface TermImage {
  id?: string
  image_url: string
  caption?: string
  order_index?: number
}

export interface FactoryTerm {
  id: string
  japanese: string
  japaneseReading: string
  japaneseAudioUrl?: string
  english: string
  englishAudioUrl?: string
  thai: string
  thaiReading: string
  thaiAudioUrl?: string
  imageUrl?: string
  images?: TermImage[]
  category: Category
  tags: string[]
  description: string
  safetyNotes?: string
  usageExamples?: UsageExample[]
  viewCount: number
  lastAccessedAt: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type ActiveTab = 'dashboard' | 'search' | 'edit' | 'learn' | 'profile'

export type Translations = {
  [key: string]: {
    [lang in Language]: string
  }
}