"use client";
import { useSession } from "next-auth/react";
import { useState } from "react";

const plans = [
  {
    key: "free",
    label: { en: "Free Plan" },
    desc: {
      en: "Basic features are available for free."
    },
    link: "#",
  },
  {
    key: "pro",
    label: { en: "Pro Plan" },
    desc: {
      en: "Advanced features & higher limits. Monthly fee."
    },
    link: "#",
  },
  {
    key: "premier",
    label: { en: "Premier Plan" },
    desc: {
      en: "Top tier plan. More features & much higher limits."
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
  const [lang, setLang] = useState<'ja'|'en'|'th'>('en');
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
      <h2 className="text-2xl font-bold mb-4">Upgrade</h2>
      <p className="mb-4 text-gray-600">
        Plan upgrade and details will be available in the future. Currently, only admin can change your plan manually.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isCurrent = userRole === plan.key;
          return (
            <div
              key={plan.key}
              className={`border rounded p-4 flex flex-col items-center ${isCurrent ? 'border-blue-600 bg-blue-50' : 'bg-gray-100 opacity-60'} ${isCurrent ? '' : 'grayscale'}`}
            >
              <div className="text-lg font-bold mb-2">{plan.label.en}</div>
              <div className="mb-2 text-sm">{plan.desc.en}</div>
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