'use client';
import React, { useState } from 'react';
import { Metadata } from 'next'

const policyContent = {
  ja: {
    title: 'プライバシーポリシー',
    updated: '最終更新日: ' + new Date().toLocaleDateString(),
    body: (
      <>
        <section>
          <h2 className="text-xl font-semibold">個人情報の取得と利用目的</h2>
          <p>当サイト（Multi Translator GGMTS）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。翻訳・要約時の入力内容はサーバーに保存されず、履歴はローカルストレージにのみ保存されます。お問い合わせ時の情報は返信・連絡のみに利用します。</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">第三者サービス・広告</h2>
          <p>Google Gemini、OpenAI GPTなどのAIサービスを利用しています。</p>
          <h3 className="text-lg font-medium mt-4">Google AdSense広告について</h3>
          <p>当サイトはGoogle AdSenseを使用して広告を配信しています。GoogleはCookieや類似技術を使用してユーザーの興味に基づく広告を表示します。広告のカスタマイズは<a href="https://www.google.com/settings/ads" className="underline" target="_blank" rel="noopener noreferrer">Google広告設定</a>で管理できます。</p>
          <h3 className="text-lg font-medium mt-4">Google Analytics等の解析ツール</h3>
          <p>当サイトはGoogle Analytics等の解析ツールを利用してアクセス状況を分析しています。これらのサービスはCookieを使用してユーザーの行動を追跡します。</p>
          <p className="mt-2">詳細については以下をご確認ください：</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">Googleプライバシーポリシー</a></li>
            <li><a href="https://support.google.com/adsense/answer/9012903" className="underline" target="_blank" rel="noopener noreferrer">Google AdSenseのプライバシーポリシー</a></li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Cookieの利用</h2>
          <p>当サイトはCookieを利用し、広告やアクセス解析に活用します。Cookieの利用を望まない場合はブラウザ設定で無効化できます。</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">免責事項</h2>
          <p>本サービスの情報・広告等の利用によって生じた損害等について、当サイトは一切の責任を負いません。</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">お問い合わせ</h2>
          <p>ご質問は<a href="/contact" className="underline">お問い合わせフォーム</a>よりご連絡ください。</p>
        </section>
      </>
    )
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: ' + new Date().toLocaleDateString(),
    body: (
      <>
        <section>
          <h2 className="text-xl font-semibold">Information Collection and Use</h2>
          <p>Multi Translator GGMTS respects your privacy. Input text for translation/summarization is not stored on our servers; history is saved only in your browser. Contact information is used solely for replies.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Third-Party Services & Ads</h2>
          <p>We use AI services such as Google Gemini and OpenAI GPT. Google AdSense and analytics tools may be used. Please review the privacy policies of these third-party services as well.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Cookies</h2>
          <p>This site uses cookies for ads and analytics. You can disable cookies in your browser settings if you prefer.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p>We are not responsible for any damages arising from the use of this service, its information, or ads.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>For questions, please use the <a href="/contact" className="underline">contact form</a>.</p>
        </section>
      </>
    )
  },
  th: {
    title: 'นโยบายความเป็นส่วนตัว',
    updated: 'อัปเดตล่าสุด: ' + new Date().toLocaleDateString(),
    body: (
      <>
        <section>
          <h2 className="text-xl font-semibold">การเก็บรวบรวมและการใช้ข้อมูลส่วนบุคคล</h2>
          <p>Multi Translator GGMTS เคารพความเป็นส่วนตัวของผู้ใช้ ข้อความที่แปล/สรุปจะไม่ถูกจัดเก็บบนเซิร์ฟเวอร์ ประวัติจะถูกบันทึกเฉพาะในเบราว์เซอร์ ข้อมูลติดต่อใช้สำหรับการตอบกลับเท่านั้น</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">บริการและโฆษณาของบุคคลที่สาม</h2>
          <p>เราใช้บริการ AI เช่น Google Gemini และ OpenAI GPT อาจมีการใช้ Google AdSense และเครื่องมือวิเคราะห์ โปรดตรวจสอบนโยบายความเป็นส่วนตัวของบริการเหล่านี้ด้วย</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">คุกกี้</h2>
          <p>เว็บไซต์นี้ใช้คุกกี้สำหรับโฆษณาและการวิเคราะห์ คุณสามารถปิดคุกกี้ได้ในเบราว์เซอร์</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">ข้อจำกัดความรับผิดชอบ</h2>
          <p>เราไม่รับผิดชอบต่อความเสียหายใด ๆ ที่เกิดจากการใช้บริการหรือข้อมูล/โฆษณาในเว็บไซต์นี้</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">ติดต่อเรา</h2>
          <p>หากมีคำถาม กรุณาติดต่อผ่าน <a href="/contact" className="underline">แบบฟอร์มติดต่อ</a></p>
        </section>
      </>
    )
  }
};

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<'ja'|'en'|'th'>('ja');
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm text-foreground space-y-4">
        <h1 className="text-3xl font-bold">{policyContent[lang].title}</h1>
        <p className="text-muted-foreground">{policyContent[lang].updated}</p>
        {policyContent[lang].body}
      </div>
    </div>
  )
} 