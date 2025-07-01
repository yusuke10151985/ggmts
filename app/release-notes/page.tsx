"use client";
import { useState } from "react";

const notes = [
  {
    id: 1,
    date: "2024-07-01",
    ja: "初回リリース。多言語翻訳・要約機能を公開。",
    en: "Initial release. Multilingual translation and summarization features launched.",
    th: "เปิดตัวครั้งแรก ฟีเจอร์แปลภาษาและสรุปหลายภาษา"
  },
  // ここに今後のリリースノートを追加
];

const langs = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "th", label: "ไทย" },
];

export default function ReleaseNotesPage() {
  const [lang, setLang] = useState("ja");
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">リリースノート / Release Notes</h2>
      <div className="mb-4 flex gap-2">
        {langs.map(l => (
          <button key={l.code} className={`px-3 py-1 rounded ${lang === l.code ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setLang(l.code)}>{l.label}</button>
        ))}
      </div>
      <ul className="space-y-4">
        {notes.map(note => (
          <li key={note.id} className="border rounded p-4">
            <div className="text-xs text-gray-500 mb-1">{note.date}</div>
            <div>{(note as unknown as Record<string, string>)[lang]}</div>
          </li>
        ))}
      </ul>
    </div>
  );
} 