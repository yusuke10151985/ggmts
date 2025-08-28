"use client";
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { History, ChevronDown, Languages, FileText, ShoppingCart, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '';
const PREMIER_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIER_PRICE_ID || '';

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
  const [selectedPlan, setSelectedPlan] = useState<'pro'|'premier'>('pro');

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
        <div className="flex items-center gap-1 sm:gap-2">
          {userAny.image && (
            <img src={userAny.image} alt="avatar" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border" />
          )}
          <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[80px] sm:max-w-[120px] truncate">{userAny.name}</span>
          <span className={`text-xs px-1 sm:px-2 py-1 rounded ${badgeColor}`}>{badgeLabel}</span>
          <span className="hidden md:inline ml-2 text-xs text-gray-400">
            {badgeLabel === 'Admin' || badgeLabel === 'Special'
              ? `${usageCount} / ∞`
              : `${usageCount} / ${usageLimit}`}
          </span>
          <Button size="sm" variant="outline" onClick={() => signOut()} className="text-xs px-2 py-1 h-auto">
            <span className="hidden sm:inline">Sign out</span>
            <span className="sm:hidden">Out</span>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex gap-1 sm:gap-2">
        <Button size="sm" onClick={() => signIn('google')} className="text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto">
          <span className="hidden sm:inline">Sign in with Google</span>
          <span className="sm:hidden">Sign in</span>
        </Button>
      </div>
    );
  };

  const handleStripePurchase = async () => {
    setLoadingStripe(true);
    const priceId = selectedPlan === 'pro' ? PRO_PRICE_ID : PREMIER_PRICE_ID;
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
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
      <div className="flex justify-between items-center px-2 sm:px-4 py-2 border-t min-h-[60px] overflow-hidden">
        <div className="flex items-center min-w-0 flex-shrink">
          <a href="/" className="flex items-center text-base sm:text-xl md:text-2xl font-bold text-black dark:text-white mr-2">
            <Home className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            <span className="hidden sm:inline">YSS Business Tools</span>
            <span className="sm:hidden">YSS</span>
          </a>
          {pathname.startsWith('/ggmts') && (
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mx-2">/</span>
          )}
          {pathname.startsWith('/ggmts') && (
            <span className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400">GGMTS</span>
          )}
          {pathname.startsWith('/mom') && (
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mx-2">/</span>
          )}
          {pathname.startsWith('/mom') && (
            <span className="text-sm sm:text-base font-semibold text-purple-600 dark:text-purple-400">MOM Manager</span>
          )}
          {pathname.startsWith('/swgr-rfq') && (
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mx-2">/</span>
          )}
          {pathname.startsWith('/swgr-rfq') && (
            <span className="text-sm sm:text-base font-semibold text-orange-600 dark:text-orange-400">SWGR RFQ</span>
          )}
          {pathname.startsWith('/factory-dictionary') && (
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mx-2">/</span>
          )}
          {pathname.startsWith('/factory-dictionary') && (
            <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">Factory Dictionary</span>
          )}
          <nav className="hidden md:flex gap-4 lg:gap-6 text-sm font-medium items-center ml-4 lg:ml-6">
            <a href="/about" className="hover:underline">About</a>
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:underline">Terms</a>
            <a href="/contact" className="hover:underline">Contact</a>
            <a href="/release-notes" className="hover:underline whitespace-nowrap">Release Notes</a>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <ThemeToggle />
          <a
            href="/upgrade"
            className="px-2 sm:px-3 py-1 bg-yellow-500 text-white rounded text-xs sm:text-sm font-bold flex items-center gap-1"
            style={{ textDecoration: 'none' }}
          >
            <ShoppingCart size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Upgrade</span>
            <span className="xs:hidden">Up</span>
          </a>
          <AuthButton />
        </div>
      </div>
    </header>
  );
} 