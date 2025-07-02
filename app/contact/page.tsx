"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

type Lang = 'ja' | 'en' | 'th';
const langs: { code: Lang; label: string }[] = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "th", label: "ไทย" },
];
const labels: Record<Lang, { title: string; name: string; email: string; message: string; send: string; required: string; success: string; error: string }> = {
  ja: { title: "お問い合わせ", name: "お名前", email: "メールアドレス", message: "お問い合わせ内容", send: "送信", required: "全ての項目を入力してください。", success: "送信が完了しました。ありがとうございました。", error: "送信に失敗しました。しばらくして再度お試しください。" },
  en: { title: "Contact Us", name: "Name", email: "Email", message: "Message", send: "Send", required: "Please fill in all fields.", success: "Your message has been sent. Thank you!", error: "Failed to send. Please try again later." },
  th: { title: "ติดต่อเรา", name: "ชื่อ", email: "อีเมล", message: "ข้อความ", send: "ส่ง", required: "กรุณากรอกทุกช่อง", success: "ส่งข้อความเรียบร้อย ขอบคุณค่ะ!", error: "ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }
};

export default function ContactPage() {
  return (
    <SessionProvider>
      <ContactForm />
    </SessionProvider>
  );
}

function ContactForm() {
  const { data: session, status } = useSession();
  const [lang, setLang] = useState<Lang>("ja");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const email = session?.user?.email || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !message) {
      setError(labels[lang].required);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, lang })
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError(labels[lang].error);
      }
    } catch {
      setError(labels[lang].error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return (
    <div className="max-w-xl mx-auto p-6">
      <p className="mb-4">Please <button className="underline text-blue-600" onClick={() => signIn("google")}>sign in with Google</button> to use the contact form.</p>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto p-6 bg-background text-foreground dark:bg-gray-900 dark:text-white">
      <div className="mb-4 flex gap-2">
        {langs.map(l => (
          <button
            key={l.code}
            className={`px-3 py-1 rounded transition-colors duration-200 ${lang === l.code ? 'bg-blue-600 text-white' : 'bg-background text-foreground dark:bg-gray-800 dark:text-white border'} `}
            onClick={() => setLang(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <h2 className="text-2xl font-bold mb-4">{labels[lang].title}</h2>
      {sent ? (
        <div className="p-4 bg-green-100 text-green-800 rounded">{labels[lang].success}</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">{labels[lang].name}</label>
            <input type="text" className="w-full border rounded p-2" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Email</label>
            <input type="email" className="w-full border rounded p-2 bg-background text-foreground dark:bg-gray-800 dark:text-white" value={email} readOnly disabled />
          </div>
          <div>
            <label className="block mb-1">{labels[lang].message}</label>
            <textarea className="w-full border rounded p-2 resize-both" style={{resize: 'both'}} rows={5} value={message} onChange={e => setMessage(e.target.value)} required />
          </div>
          {error && <div className="text-red-600">{error}</div>}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{labels[lang].send}</button>
        </form>
      )}
    </div>
  );
} 