"use client";
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { History, ChevronDown, Languages, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef } from 'react';
import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function GlobalHeader() {
  return (
    <SessionProvider>
      <HeaderContent />
    </SessionProvider>
  );
}

function HeaderContent() {
  const [mode, setMode] = useState<'translate' | 'summarize'>('translate');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const pathname = usePathname();
  const AuthButton = () => {
    if (session?.user) {
      return (
        <div className="flex items-center gap-2">
          {session.user.image && (
            <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full border" />
          )}
          <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{session.user.name}</span>
          <Button size="sm" variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>
      );
    }
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => signIn('google')}>Sign in with Google</Button>
      </div>
    );
  };
  return (
    <header className="sticky top-0 z-50 bg-card border-b w-full">
      <div className="flex justify-between items-center px-4 py-2 border-t">
        <div className="flex-1 flex items-center gap-8 min-w-0">
          <a href="/" className="text-xl md:text-2xl font-bold text-black whitespace-nowrap mr-6">Multi Translator GGMTS</a>
          <nav className="flex gap-6 text-sm font-medium flex-nowrap items-center">
            <a href="/about" className="hover:underline">About</a>
            <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:underline">Terms</a>
            <a href="/contact" className="hover:underline">Contact</a>
            <a href="/release-notes" className="hover:underline">Release Notes</a>
          </nav>
          {pathname === '/' && (
            <div ref={modeDropdownRef} className="relative ml-8">
              <Button
                variant="ghost"
                onClick={() => setIsModeDropdownOpen(prev => !prev)}
                className="text-xl md:text-2xl font-bold flex items-center gap-2"
              >
                {mode === 'translate' ? <Languages className="w-7 h-7 text-primary" /> : <FileText className="w-7 h-7 text-primary" />}
                <span className="capitalize">{mode === 'translate' ? 'Translator' : 'Summarizer'}</span>
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform transform ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              <AnimatePresence>
                {isModeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-20 py-1"
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${mode === 'translate' ? 'bg-accent text-accent-foreground' : ''}`}
                      onClick={() => {
                        setMode('translate')
                        setIsModeDropdownOpen(false)
                      }}
                    >
                      <Languages className="w-4 h-4 mr-2" />
                      Translator
                    </Button>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${mode === 'summarize' ? 'bg-accent text-accent-foreground' : ''}`}
                      onClick={() => {
                        setMode('summarize')
                        setIsModeDropdownOpen(false)
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Summarizer
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHistoryVisible(!isHistoryVisible)}
            className="mx-2"
            aria-label="Show translation history"
          >
            <History className="w-5 h-5" />
          </Button>
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
} 