"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    const user: any = session?.user;
    if (!session || user?.role !== "admin") {
      router.replace("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/admin/settings")
        .then((res) => res.json())
        .then((data) => setSettings(data));
    }
  }, [status]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleSave = useCallback(async (key: string, value: string) => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      setMessage("保存しました");
    } else {
      setMessage("保存に失敗しました");
    }
    setLoading(false);
  }, []);

  if (status === "loading" || !session || (session.user as any)?.role !== "admin") {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>管理者専用ページです。</p>
      <h2 className="mt-8 mb-2 font-bold">設定値の編集</h2>
      {settings.length === 0 && <div>設定値を取得中...</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="space-y-4"
      >
        {settings
          .filter((setting) => setting.key === "free_user_daily_limit")
          .map((setting) => (
            <div key={setting.key} className="flex items-center gap-2">
              <label className="w-56 font-mono">{setting.key}</label>
              <input
                type="text"
                value={setting.value}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                className="border px-2 py-1 rounded w-40"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => handleSave(setting.key, setting.value)}
                className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={loading}
              >
                保存
              </button>
              <span className="text-gray-500 text-xs ml-2">{setting.description}</span>
            </div>
          ))}
      </form>
      {message && <div className="mt-2 text-green-600">{message}</div>}
    </div>
  );
} 