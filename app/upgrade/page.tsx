"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

const planKeys: ('free'|'pro'|'premier')[] = ["free", "pro", "premier"];
const planLabels: Record<'free'|'pro'|'premier', string> = {
  free: "Free Plan",
  pro: "Pro Plan",
  premier: "Premier Plan"
};
const planDescriptions = [
  {
    key: "feature1",
    en: "Basic translation and summary features",
    ja: "基本的な翻訳・要約機能",
    th: "ฟีเจอร์แปลและสรุปพื้นฐาน"
  },
  {
    key: "feature2",
    en: "Priority support",
    ja: "優先サポート",
    th: "การสนับสนุนลำดับความสำคัญ"
  },
  {
    key: "feature3",
    en: "Higher daily usage limit",
    ja: "1日の利用上限アップ",
    th: "ขีดจำกัดการใช้งานรายวันสูงขึ้น"
  }
];
const planFeatureMatrix: Record<'free'|'pro'|'premier', boolean[]> = {
  free: [true, false, false],
  pro: [true, true, true],
  premier: [true, true, true]
};
const langs = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "th", label: "ไทย" },
];
const planLimitKeys = {
  free: "free_user_daily_limit",
  pro: "pro_user_daily_limit",
  premier: "premier_user_daily_limit"
};
const planLimitLabel = {
  en: "Daily usage limit",
  ja: "1日の利用上限",
  th: "ขีดจำกัดการใช้งานรายวัน"
};
const descText = {
  en: "Plan upgrade and details will be available in the future. Currently, only admin can change your plan manually.",
  ja: "各プランの詳細・アップグレードは今後実装予定です。現状は管理者による手動変更のみ対応しています。",
  th: "การอัปเกรดแผนและรายละเอียดจะพร้อมใช้งานในอนาคต ขณะนี้ผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนแผนให้คุณได้"
};

export default function UpgradePage() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<'ja'|'en'|'th'>('en');
  const userRole = (session?.user as any)?.role || 'free';
  const [limits, setLimits] = useState<Record<'free'|'pro'|'premier', string>>({free: '-', pro: '-', premier: '-'});

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then((data) => {
        const lim: Record<'free'|'pro'|'premier', string> = {};
        for (const p of planKeys) {
          const found = data.find((s:any) => s.key === planLimitKeys[p]);
          lim[p] = found ? found.value : '-';
        }
        setLimits(lim);
      });
  }, []);

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
      <h2 className="text-2xl font-bold mb-4">Upgrade</h2>
      <p className="mb-4 text-gray-600">{descText[lang]}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planKeys.map(plan => {
          const isCurrent = userRole === plan;
          return (
            <div
              key={plan}
              className={`border rounded p-4 flex flex-col items-center ${isCurrent ? 'border-blue-600 bg-blue-50' : 'bg-gray-100 opacity-60'} ${isCurrent ? '' : 'grayscale'}`}
            >
              <div className="text-lg font-bold mb-2">{planLabels[plan]}</div>
              <ul className="mb-2 text-sm text-left w-full">
                {planDescriptions.map((desc, i) => (
                  <li key={desc.key} className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-4 h-4 rounded-full border flex items-center justify-center text-xs font-bold ${planFeatureMatrix[plan][i] ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-400'}`}>{planFeatureMatrix[plan][i] ? '✓' : ''}</span>
                    <span>{desc[lang]}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2 mt-2">
                  <span className="inline-block w-4 h-4 rounded-full border flex items-center justify-center text-xs font-bold bg-blue-600 text-white">✓</span>
                  <span>{planLimitLabel[lang]}: <b>{limits[plan]}</b></span>
                </li>
              </ul>
              {isCurrent ? (
                <div className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Current Plan</div>
              ) : (
                <button className="px-3 py-1 bg-gray-400 text-white rounded text-xs cursor-not-allowed" disabled>
                  Not available
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 