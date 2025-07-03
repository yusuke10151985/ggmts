import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider, useSession } from 'next-auth/react';
import ClientLayout from './client-layout';
import FooterWithAdmin from '@/components/FooterWithAdmin';
import GlobalHeader from '@/components/GlobalHeader';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multi Translator GGMTS',
  description: 'Translate and summarize text in multiple languages using AI-powered services like Gemini and GPT.',
  keywords: 'translator, translation, multilingual, AI, Gemini, GPT, summarize, language',
  authors: [{ name: 'Multi Translator GGMTS' }],
  robots: 'index, follow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientLayout>
            <GlobalHeader />
            <main>{children}</main>
            <FooterWithAdmin />
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
} 