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
      const userAny = session.user as any;
      let badgeLabel = '';
      let badgeColor = '';
      switch (userAny.role) {
        case 'admin':
          badgeLabel = 'Admin'; badgeColor = 'bg-red-600 text-white'; break;
        case 'pro':
          badgeLabel = 'Pro'; badgeColor = 'bg-blue-600 text-white'; break;
        case 'special':
          badgeLabel = 'Special'; badgeColor = 'bg-green-600 text-white'; break;
        default:
          badgeLabel = 'Free'; badgeColor = 'bg-gray-400 text-white'; break;
      }
      return (
        <div className="flex items-center gap-2">
          {userAny.image && (
            <img src={userAny.image} alt="avatar" className="w-8 h-8 rounded-full border" />
          )}
          <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{userAny.name}</span>
          <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>{badgeLabel}</span>
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
          <a href="/" className="text-xl md:text-2xl font-bold text-black dark:text-white whitespace-nowrap mr-2">Multi Translator GGMTS</a>
          <nav className="flex gap-6 text-sm font-medium flex-nowrap items-center ml-6">
            <a href="/about" className="hover:underline">About</a>
            <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:underline">Terms</a>
            <a href="/contact" className="hover:underline">Contact</a>
            <a href="/release-notes" className="hover:underline">Release Notes</a>
            {session?.user && (session.user as any).role === 'admin' && (
              <a href="/admin/dashboard" className="hover:underline text-red-600 font-bold">Admin</a>
            )}
          </nav>
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