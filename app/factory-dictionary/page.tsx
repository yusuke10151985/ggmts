'use client'

import FactoryDictionaryClient from './client-page'
import { SessionProvider } from 'next-auth/react'

export default function FactoryDictionaryPage() {
  return (
    <SessionProvider>
      <FactoryDictionaryClient />
    </SessionProvider>
  )
}