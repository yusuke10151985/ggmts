'use client';
import React, { useState } from 'react';

const termsContent = {
  ja: {
    title: '利用規約',
    updated: '最終更新日: ' + new Date().toLocaleDateString(),
    body: (
      <>
        <section>
          <h2 className="text-xl font-semibold">利用規約への同意</h2>
          <p>本サービス（Multi Translator GGMTS）をご利用いただくことで、本規約に同意したものとみなします。規約に同意いただけない場合はご利用をお控えください。規約は予告なく変更される場合があります。</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">禁止事項</h2>
          <ul className="list-disc pl-5">
            <li>法令または公序良俗に違反する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>不正アクセス等の行為</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold">サービスの提供・変更</h2>
          <p>本サービスは、予告なく内容の変更・停止・終了する場合があります。</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">免責事項</h2>
          <p>本サービスの利用により生じた損害等について、当サイトは一切の責任を負いません。</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">お問い合わせ</h2>
          <p>ご質問は<a href="/contact" className="underline">お問い合わせフォーム</a>よりご連絡ください。</p>
        </section>
      </>
    )
  },
  en: {
    title: 'Terms of Service',
    updated: 'Last updated: ' + new Date().toLocaleDateString(),
    body: (
      <>
        <section>
          <h2 className="text-xl font-semibold">Acceptance of Terms</h2>
          <p>By using Multi Translator GGMTS, you agree to these terms. If you do not agree, please do not use the service. Terms may be changed without notice.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Prohibited Actions</h2>
          <ul className="list-disc pl-5">
            <li>Acts that violate laws or public order and morals</li>
            <li>Acts that interfere with the operation of this service</li>
            <li>Unauthorized access, etc.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Service Provision & Changes</h2>
          <p>The service may be changed, suspended, or terminated without notice.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p>We are not responsible for any damages arising from the use of this service.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>For questions, please use the <a href="/contact" className="underline">contact form</a>.</p>
        </section>
      </>
    )
  },
  th: {
    title: 'ข้อกำหนดการใช้บริการ',
    updated: 'อัปเดตล่าสุด: ' + new Date().toLocaleDateString(),
    body: (
      <>
        <section>
          <h2 className="text-xl font-semibold">การยอมรับข้อกำหนด</h2>
          <p>เมื่อใช้บริการ Multi Translator GGMTS ถือว่าคุณยอมรับข้อกำหนดนี้ หากไม่ยอมรับ กรุณางดใช้บริการ ข้อกำหนดอาจเปลี่ยนแปลงโดยไม่ต้องแจ้งล่วงหน้า</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">ข้อห้าม</h2>
          <ul className="list-disc pl-5">
            <li>การกระทำที่ผิดกฎหมายหรือศีลธรรมอันดี</li>
            <li>การรบกวนการดำเนินงานของบริการนี้</li>
            <li>การเข้าถึงโดยไม่ได้รับอนุญาต ฯลฯ</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold">การให้บริการและการเปลี่ยนแปลง</h2>
          <p>บริการอาจมีการเปลี่ยนแปลง ระงับ หรือยุติโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">ข้อจำกัดความรับผิดชอบ</h2>
          <p>เราไม่รับผิดชอบต่อความเสียหายใด ๆ ที่เกิดจากการใช้บริการนี้</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">ติดต่อเรา</h2>
          <p>หากมีคำถาม กรุณาติดต่อผ่าน <a href="/contact" className="underline">แบบฟอร์มติดต่อ</a></p>
        </section>
      </>
    )
  }
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold">{termsContent[lang].title}</h1>
        <p className="text-muted-foreground">{termsContent[lang].updated}</p>
        {termsContent[lang].body}
      </div>
    </div>
  )
} 