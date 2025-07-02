'use client';
import React, { useEffect, useState } from 'react';

export default function AboutPage() {
  const [about, setAbout] = useState<any>({ content_ja: '', content_en: '', content_th: '' });
  const [lang, setLang] = useState<'ja'|'en'|'th'>('ja');
  useEffect(() => {
    fetch('/api/admin/about').then(res => res.json()).then(data => {
      if (data) setAbout(data);
    });
  }, []);
  return (
    <main className="max-w-2xl mx-auto p-4">
      <div className="mb-4 flex gap-2">
        {(['ja','en','th'] as const).map(l => (
          <button
            key={l}
            className={`px-3 py-1 rounded transition-colors duration-200 ${lang === l ? 'bg-blue-600 text-white' : 'bg-background text-foreground dark:bg-gray-800 dark:text-white border'}`}
            onClick={() => setLang(l)}
          >
            {l === 'ja' ? '日本語' : l === 'en' ? 'English' : 'ไทย'}
          </button>
        ))}
      </div>
      <section className="mb-6 bg-card p-4 rounded shadow border min-h-[200px]">
        <h1 className="text-2xl font-bold mb-2">About Multi Translator GGMTS</h1>
        <div dangerouslySetInnerHTML={{__html: about[`content_${lang}`]||''}} />
      </section>
    </main>
  );
} 