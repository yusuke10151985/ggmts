import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider, useSession } from 'next-auth/react';
import ClientLayout from './client-layout';
import FooterWithAdmin from '@/components/FooterWithAdmin';
import GlobalHeader from '@/components/GlobalHeader';
import { useEffect } from "react";

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

function BlockGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (session?.user?.role === "block") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
        <div className="max-w-xl bg-card p-8 rounded shadow border text-center">
          <h1 className="text-2xl font-bold mb-4">アクセス制限 / Access Blocked / การเข้าถึงถูกบล็อก</h1>
          <p className="mb-2">あなたはなんらかの理由でこのWebサイトにアクセスできません。使用を要求する場合、<b>コンタクト</b>から管理者へご連絡ください。</p>
          <p className="mb-2">You are blocked from accessing this website for some reason. If you wish to request access, please contact the administrator via <b>Contact</b>.</p>
          <p>คุณไม่สามารถเข้าถึงเว็บไซต์นี้ได้ หากต้องการใช้งาน กรุณาติดต่อผู้ดูแลผ่าน <b>Contact</b></p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
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
            <BlockGuard>
              <GlobalHeader />
              <main>{children}</main>
              <FooterWithAdmin />
            </BlockGuard>
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
} 