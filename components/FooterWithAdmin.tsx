"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function FooterWithAdmin() {
  const { data: session } = useSession();
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