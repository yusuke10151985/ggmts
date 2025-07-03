"use client";
import { useSession } from 'next-auth/react';
import React from 'react';
import { usePathname } from 'next/navigation';

export default function BlockGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  console.log('BlockGuard session:', session, status);
  if (status === "loading") return null;
  if (session?.user?.role === "block") {
    if (pathname === "/contact") {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
        <div className="max-w-xl bg-card p-8 rounded shadow border text-center">
          <h1 className="text-2xl font-bold mb-4">アクセス制限 / Access Blocked / การเข้าถึงถูกบล็อก</h1>
          <p className="mb-2">あなたはなんらかの理由でこのWebサイトにアクセスできません。使用を要求する場合、<a href="/contact" className="underline text-blue-600">コンタクト</a>から管理者へご連絡ください。</p>
          <p className="mb-2">You are blocked from accessing this website for some reason. If you wish to request access, please contact the administrator via <a href="/contact" className="underline text-blue-600">Contact</a>.</p>
          <p>คุณไม่สามารถเข้าถึงเว็บไซต์นี้ได้ หากต้องการใช้งาน กรุณาติดต่อผู้ดูแลผ่าน <a href="/contact" className="underline text-blue-600">Contact</a></p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
} 