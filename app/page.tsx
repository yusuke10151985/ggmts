"use client"

import { TranslatorApp } from '@/components/translator-app'
import { SessionProvider } from 'next-auth/react'

export default function HomePage() {
  return (
    <SessionProvider>
      <TranslatorApp />
    </SessionProvider>
  )
} 