"use client";
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { History, ChevronDown, Languages, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '';

export default function GlobalHeader() {
  return <HeaderContent />;
}

function HeaderContent() {
  const [mode, setMode] = useState<'translate' | 'summarize'>('translate');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const pathname = usePathname();
  const [usageCount, setUsageCount] = useState<number>(0);
  const [usageLimit, setUsageLimit] = useState<number>(0);
  const [loadingStripe, setLoadingStripe] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/user-usage')
      .then(res => res.json())
      .then(data => {
        setUsageCount(data.usageCount || 0);
        setUsageLimit(data.usageLimit || 0);
      });
  }, [session?.user]);

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
        case 'premier':
          badgeLabel = 'Premier'; badgeColor = 'bg-yellow-500 text-white'; break;
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
          <span className="ml-2 text-xs text-gray-400">
            {badgeLabel === 'Admin' || badgeLabel === 'Special'
              ? `${usageCount} / ∞`
              : `${usageCount} / ${usageLimit}`}
          </span>
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

  const handleProPurchase = async () => {
    setLoadingStripe(true);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: PRO_PRICE_ID }),
    });
    const data = await res.json();
    setLoadingStripe(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Stripe決済ページの生成に失敗しました');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b w-full">
      <div className="flex justify-between items-center px-4 py-2 border-t">
        <div className="flex-1 flex items-center gap-8 min-w-0">
          <a href="/" className="flex items-center text-xl md:text-2xl font-bold text-black dark:text-white whitespace-nowrap mr-2">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="mr-2 rounded-full" />
            Multi Translator GGMTS
          </a>
          <nav className="flex gap-6 text-sm font-medium flex-nowrap items-center ml-6 whitespace-nowrap">
            <a href="/about" className="hover:underline whitespace-nowrap">About</a>
            <a href="/contact" className="hover:underline whitespace-nowrap">Contact</a>
            <a href="/release-notes" className="hover:underline whitespace-nowrap">Release Notes</a>
          </nav>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          <ThemeToggle />
          <button
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm font-bold disabled:opacity-50"
            onClick={handleProPurchase}
            disabled={loadingStripe || !PRO_PRICE_ID}
          >
            {loadingStripe ? 'Loading...' : 'Proプラン購入'}
          </button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
} 