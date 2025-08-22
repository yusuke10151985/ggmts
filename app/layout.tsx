import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import SessionProviderWrapper from './session-provider'
import FooterWithAdmin from '@/components/FooterWithAdmin';
import GlobalHeader from '@/components/GlobalHeader';
import BlockGuard from '@/components/BlockGuard';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'GGMTS - AI-Powered Multi-Language Translation & Summarization',
    template: '%s | GGMTS'
  },
  description: 'Free AI-powered translation and summarization service supporting Japanese, English, Thai, and more. Powered by Google Gemini and OpenAI GPT for accurate translations.',
  keywords: 'translation, translator, multilingual, AI, artificial intelligence, Google Gemini, OpenAI GPT, Japanese translation, English translation, Thai translation, text summarization, free translation service, online translator',
  authors: [{ name: 'GGMTS Team' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://www.ggmts.com',
    title: 'GGMTS - AI-Powered Multi-Language Translation & Summarization',
    description: 'Free AI-powered translation and summarization service supporting multiple languages',
    siteName: 'GGMTS',
  },
  twitter: {
    card: 'summary',
    title: 'GGMTS - AI Translation Service',
    description: 'Free AI-powered translation and summarization service',
  },
  verification: {
    google: '', // Google Search Console verification code will be added here
  },
  alternates: {
    canonical: 'https://www.ggmts.com',
  },
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
        {/* Google Analytics - 測定ID: G-BV3ZRJ84DP */}
        <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-BV3ZRJ84DP'} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProviderWrapper>
            <BlockGuard>
              <GlobalHeader />
              <main className="pb-24">{children}</main>
              <FooterWithAdmin />
            </BlockGuard>
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
} 