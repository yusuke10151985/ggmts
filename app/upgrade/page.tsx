"use client";
import { useSession } from "next-auth/react";
import { useState } from "react";

const plans = [
  {
    key: "free",
    label: { ja: "無料プラン", en: "Free Plan", th: "ฟรี" },
    desc: {
      ja: "基本機能が無料で使えます。",
      en: "Basic features are available for free.",
      th: "ฟีเจอร์พื้นฐานใช้ฟรี"
    },
    link: "#",
  },
  {
    key: "pro",
    label: { ja: "Proプラン", en: "Pro Plan", th: "โปร" },
    desc: {
      ja: "高度な機能・上限アップ。月額課金。",
      en: "Advanced features & higher limits. Monthly fee.",
      th: "ฟีเจอร์ขั้นสูงและขีดจำกัดสูงขึ้น รายเดือน"
    },
    link: "#",
  },
  {
    key: "premier",
    label: { ja: "Premierプラン", en: "Premier Plan", th: "พรีเมียร์" },
    desc: {
      ja: "最上位プラン。さらに多機能・上限大幅アップ。",
      en: "Top tier plan. More features & much higher limits.",
      th: "แผนสูงสุด ฟีเจอร์มากขึ้น ขีดจำกัดสูงสุด"
    },
    link: "#",
  },
];

const langs = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "th", label: "ไทย" },
];

export default function UpgradePage() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<'ja'|'en'|'th'>('ja');
  const userRole = (session?.user as any)?.role || 'free';

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4 flex gap-2">
        {langs.map(l => (
          <button
            key={l.code}
            className={`px-3 py-1 rounded transition-colors duration-200 ${lang === l.code ? 'bg-blue-600 text-white' : 'bg-background text-foreground dark:bg-gray-800 dark:text-white border'} `}
            onClick={() => setLang(l.code as any)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <h2 className="text-2xl font-bold mb-4">{lang === 'ja' ? 'アップグレード' : lang === 'en' ? 'Upgrade' : 'อัปเกรด'}</h2>
      <p className="mb-4 text-gray-600">
        {lang === 'ja' && '各プランの詳細・アップグレードは今後実装予定です。現状は管理者による手動変更のみ対応しています。'}
        {lang === 'en' && 'Plan upgrade and details will be available in the future. Currently, only admin can change your plan manually.'}
        {lang === 'th' && 'การอัปเกรดแผนและรายละเอียดจะพร้อมใช้งานในอนาคต ขณะนี้ผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนแผนให้คุณได้'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isCurrent = userRole === plan.key;
          return (
            <div
              key={plan.key}
              className={`border rounded p-4 flex flex-col items-center ${isCurrent ? 'border-blue-600 bg-blue-50' : 'bg-gray-100 opacity-60'} ${isCurrent ? '' : 'grayscale'}`}
            >
              <div className="text-lg font-bold mb-2">{plan.label[lang]}</div>
              <div className="mb-2 text-sm">{plan.desc[lang]}</div>
              {isCurrent ? (
                <div className="px-3 py-1 bg-blue-600 text-white rounded text-xs">{lang === 'ja' ? '現在のプラン' : lang === 'en' ? 'Current Plan' : 'แผนปัจจุบัน'}</div>
              ) : (
                <button className="px-3 py-1 bg-gray-400 text-white rounded text-xs cursor-not-allowed" disabled>
                  {lang === 'ja' ? '選択不可' : lang === 'en' ? 'Not available' : 'ไม่สามารถเลือกได้'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 