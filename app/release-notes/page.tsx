"use client";
import { useState, useEffect } from "react";

const langs = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "th", label: "ไทย" },
];

export default function ReleaseNotesPage() {
  const [lang, setLang] = useState("ja");
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/release-notes")
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">リリースノート / Release Notes</h2>
      <div className="mb-4 flex gap-2">
        {langs.map(l => (
          <button key={l.code} className={`px-3 py-1 rounded ${lang === l.code ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setLang(l.code)}>{l.label}</button>
        ))}
      </div>
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-4">
          {notes.map(note => (
            <li key={note.id} className="border rounded p-4">
              <div className="text-xs text-gray-500 mb-1">{note.createdAt?.slice(0,10)} {note.title && <span className="ml-2 font-bold">{note.title}</span>}</div>
              <div>{note[`content_${lang}`]}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 