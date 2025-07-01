import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import dynamic from 'next/dynamic';
import { SessionProvider, useSession } from 'next-auth/react';
import ClientLayout from './client-layout';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] })

const GlobalHeader = dynamic(() => import('@/components/GlobalHeader'), { ssr: false });

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

function FooterWithAdmin() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    setIsAdmin((session?.user as any)?.role === 'admin');
  }, [session]);
  return (
    <footer className="flex flex-col items-center gap-2 p-4 border-t text-sm w-full fixed bottom-0 left-0 bg-card z-50">
      <nav className="flex gap-6">
        <a href="/about">About</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
        <a href="/release-notes">Release Notes</a>
        {isAdmin && <a href="/admin/dashboard">Admin</a>}
      </nav>
      <small>© 2025 Multi Translator GGMTS. All rights reserved.</small>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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