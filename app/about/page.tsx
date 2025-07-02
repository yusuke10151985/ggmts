'use client';
import React, { useState } from 'react';

const aboutContent = {
  ja: {
    title: 'Multi Translator GGMTSについて',
    body: (
      <>
        <p className="mb-2">Multi Translator GGMTSは、Google GeminiとOpenAI GPTを活用した多言語翻訳・要約AIウェブアプリです。日本語・英語・タイ語など多言語に対応し、即時に翻訳・要約が可能です。</p>
        <ul className="list-disc pl-5 mb-2">
          <li>テキストを入力または貼り付け</li>
          <li>翻訳/要約・対象言語を選択</li>
          <li>結果をコピー・保存・共有</li>
          <li>履歴・多言語UI・会員管理・管理者ダッシュボード搭載</li>
        </ul>
        <p className="text-sm text-muted-foreground">ご質問・ご要望は<a href="/contact" className="underline">お問い合わせフォーム</a>よりご連絡ください。</p>
      </>
    )
  },
  en: {
    title: 'About Multi Translator GGMTS',
    body: (
      <>
        <p className="mb-2">Multi Translator GGMTS is an AI-powered web app using Google Gemini and OpenAI GPT for instant multilingual translation and summarization. Supports Japanese, English, Thai, and more.</p>
        <ul className="list-disc pl-5 mb-2">
          <li>Enter or paste your text</li>
          <li>Select Translate/Summarize and target languages</li>
          <li>Copy, save, or share results</li>
          <li>History, multilingual UI, membership, and admin dashboard</li>
        </ul>
        <p className="text-sm text-muted-foreground">For questions or feedback, please use the <a href="/contact" className="underline">contact form</a>.</p>
      </>
    )
  },
  th: {
    title: 'เกี่ยวกับ Multi Translator GGMTS',
    body: (
      <>
        <p className="mb-2">Multi Translator GGMTS เป็นเว็บแอป AI สำหรับแปลและสรุปข้อความหลายภาษาแบบทันที รองรับภาษาไทย อังกฤษ ญี่ปุ่น และอื่น ๆ โดยใช้ Google Gemini และ OpenAI GPT</p>
        <ul className="list-disc pl-5 mb-2">
          <li>กรอกหรือวางข้อความ</li>
          <li>เลือกแปล/สรุปและภาษาปลายทาง</li>
          <li>คัดลอก บันทึก หรือแชร์ผลลัพธ์</li>
          <li>มีประวัติ, UI หลายภาษา, ระบบสมาชิก, แดชบอร์ดผู้ดูแล</li>
        </ul>
        <p className="text-sm text-muted-foreground">หากมีคำถามหรือข้อเสนอแนะ กรุณาติดต่อผ่าน <a href="/contact" className="underline">แบบฟอร์มติดต่อ</a></p>
      </>
    )
  }
};

export default function AboutPage() {
  const [lang, setLang] = useState<'ja'|'en'|'th'>('ja');
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
      <section className="mb-6 bg-card p-4 rounded shadow border">
        <h1 className="text-2xl font-bold mb-2">{aboutContent[lang].title}</h1>
        {aboutContent[lang].body}
      </section>
    </main>
  );
} 