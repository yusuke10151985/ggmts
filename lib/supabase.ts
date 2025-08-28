import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Factory Dictionary will use Prisma database instead.')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// For server-side operations with elevated privileges
export const getServiceSupabase = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Type definitions for Factory Dictionary
export interface FactoryTerm {
  id: string
  japanese: string
  japanese_reading: string
  english: string
  thai: string
  thai_reading: string
  category: string
  description: string
  safety_notes?: string
  image_url?: string
  japanese_audio_url?: string
  english_audio_url?: string
  thai_audio_url?: string
  tags: string[]
  view_count: number
  last_accessed_at: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface FactoryUsageExample {
  id: string
  term_id: string
  japanese: string
  english: string
  thai: string
  context?: string
  created_at: string
}