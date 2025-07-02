"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [usage, setUsage] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userMsg, setUserMsg] = useState("");
  const [filters, setFilters] = useState({ from: '', to: '', userId: '', apiType: '' });
  const [notes, setNotes] = useState<any[]>([]);
  const [noteForm, setNoteForm] = useState({ title: '', content_ja: '', content_en: '', content_th: '', isEdit: false });
  const [noteMsg, setNoteMsg] = useState('');
  // --- グラフサイズ調整用 state ---
  const [chartWidth, setChartWidth] = useState(1000);
  const [chartHeight, setChartHeight] = useState(500);
  // About編集用state
  const [about, setAbout] = useState<any>({ content_ja: '', content_en: '', content_th: '' });
  const [aboutLang, setAboutLang] = useState<'ja'|'en'|'th'>('ja');
  const [aboutMsg, setAboutMsg] = useState('');

  useEffect(() => {
    if (status === "loading") return;
    const user: any = session?.user;
    if (!session || user?.role !== "admin") {
      router.replace("/");
    }
  }, [session, status, router]);

  // フィルタでusage再取得
  const fetchUsage = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.apiType) params.append('apiType', filters.apiType);
    fetch(`/api/admin/usage-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setUsage(data));
  }, [filters]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/admin/settings")
        .then((res) => res.json())
        .then((data) => setSettings(data));
      fetch("/api/admin/users")
        .then((res) => res.json())
        .then((data) => setUsers(data));
      fetchUsage();
    }
  }, [status, fetchUsage]);

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUserMsg("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setUserMsg("会員種別を変更しました");
    } else {
      setUserMsg("変更に失敗しました");
    }
  };

  const handleResetUsage = async (userId?: string) => {
    setUserMsg("");
    const res = await fetch("/api/admin/usage-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userId ? { userId } : {}),
    });
    if (res.ok) {
      setUserMsg(userId ? "利用履歴をリセットしました" : "全ユーザーの履歴をリセットしました");
      // 履歴・集計も再取得
      fetch("/api/admin/usage-logs").then((r) => r.json()).then((data) => setUsage(data));
    } else {
      setUserMsg("リセットに失敗しました");
    }
  };

  // CSVエクスポート関数
  const exportLogsCsv = () => {
    if (!usage?.logs) return;
    const headers = [
      '日時', 'User', 'API種別', 'トークン数', 'コスト', '入力', '結果'
    ];
    const rows = usage.logs.map((log: any) => [
      new Date(log.createdAt).toLocaleString(),
      log.user?.name || log.user?.email || log.userId || '未ログイン',
      log.apiType,
      log.tokens,
      log.cost,
      log.inputText,
      log.result
    ]);
    const csvRows = [headers, ...rows].map(r => r.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-usage-logs_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ユーザー集計CSVエクスポート関数
  const exportUserStatsCsv = () => {
    if (!usage?.userStats) return;
    const headers = ['UserID', '回数', 'トークン数', 'コスト(USD)'];
    const rows = usage.userStats.map((u: any) => [
      u.userId || '未ログイン',
      u._count._all,
      u._sum.tokens,
      u._sum.cost
    ]);
    const csvRows = [headers, ...rows].map(r => r.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-stats_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // リリースノート取得
  const fetchNotes = useCallback(() => {
    fetch('/api/release-notes')
      .then(res => res.json())
      .then(data => setNotes(data));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchNotes();
  }, [status, fetchNotes]);

  // 新規追加
  const handleAddNote = async () => {
    setNoteMsg('');
    const res = await fetch('/api/release-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteForm),
    });
    if (res.ok) {
      setNoteMsg('追加しました');
      setNoteForm({ title: '', content_ja: '', content_en: '', content_th: '', isEdit: false });
      fetchNotes();
    } else {
      const err = await res.json();
      setNoteMsg('追加に失敗: ' + (err.error || '')); 
    }
  };

  // About取得
  useEffect(() => {
    fetch('/api/admin/about').then(res => res.json()).then(data => {
      if (data) setAbout(data);
    });
  }, []);

  // About保存
  const handleSaveAbout = async () => {
    setAboutMsg('');
    const res = await fetch('/api/admin/about', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(about),
    });
    if (res.ok) setAboutMsg('保存しました');
    else setAboutMsg('保存に失敗しました');
  };

  if (status === "loading" || !session || (session.user as any)?.role !== "admin") {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>管理者専用ページです。</p>

      {/* --- 利用状況・コスト集計 --- */}
      <section className="mt-8">
        <h2 className="font-bold mb-2">利用状況・コスト集計</h2>
        {/* フィルタフォーム */}
        <form className="flex gap-2 flex-wrap mb-4 items-end" onSubmit={e => { e.preventDefault(); fetchUsage(); }}>
          <div>
            <label className="block text-xs">開始日</label>
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="border px-2 py-1 rounded" />
          </div>
          <div>
            <label className="block text-xs">終了日</label>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="border px-2 py-1 rounded" />
          </div>
          <div>
            <label className="block text-xs">ユーザー</label>
            <select value={filters.userId} onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))} className="border px-2 py-1 rounded">
              <option value="">全ユーザー</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs">API種別</label>
            <select value={filters.apiType} onChange={e => setFilters(f => ({ ...f, apiType: e.target.value }))} className="border px-2 py-1 rounded">
              <option value="">全種別</option>
              <option value="translate">translate</option>
              <option value="summarize">summarize</option>
            </select>
          </div>
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">絞り込み</button>
          <button type="button" className="px-3 py-1 bg-gray-400 text-white rounded" onClick={() => { setFilters({ from: '', to: '', userId: '', apiType: '' }); fetchUsage(); }}>リセット</button>
        </form>
        {/* グラフサイズ調整UI */}
        <div className="flex gap-4 items-center mb-2">
          <label className="text-xs">グラフ幅(px):</label>
          <input type="number" min={200} max={2000} value={chartWidth} onChange={e => setChartWidth(Number(e.target.value))} className="border px-2 py-1 rounded w-20" />
          <label className="text-xs">高さ(px):</label>
          <input type="number" min={100} max={1000} value={chartHeight} onChange={e => setChartHeight(Number(e.target.value))} className="border px-2 py-1 rounded w-20" />
        </div>
        {/* 日別API実行回数グラフ */}
        {usage?.dailyStats && usage.dailyStats.length > 0 && (
          <div className="mb-6 p-0" style={{ width: chartWidth, height: chartHeight + 60, background: 'var(--card)' }}>
            <h3 className="font-semibold mb-2">日別API実行回数</h3>
            <ResponsiveContainer width={chartWidth} height={chartHeight}>
              <LineChart data={Array.from(
                Object.values(
                  usage.dailyStats.reduce((acc: any, d: any) => {
                    const date = d.createdAt.slice(0, 10);
                    if (!acc[date]) {
                      acc[date] = { date, count: 0, tokens: 0, cost: 0 };
                    }
                    acc[date].count += d._count._all;
                    acc[date].tokens += d._sum.tokens;
                    acc[date].cost += d._sum.cost;
                    return acc;
                  }, {})
                )
              )}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={date => date} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: '#fff' }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fill: '#fff' }} />
                <Tooltip />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#8884d8" name="API回数" />
                <Line yAxisId="left" type="monotone" dataKey="tokens" stroke="#82ca9d" name="トークン数" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#ff7300" name="コスト" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {!usage ? (
          <div>集計データを取得中...</div>
        ) : (
          <>
            <div className="mb-4 flex gap-8">
              <div className="p-2 border rounded bg-gray-900 text-white dark:bg-gray-900 dark:text-white">
                <div className="text-xs text-gray-500">全体API実行回数</div>
                <div className="text-2xl font-bold">{usage.total._count._all}</div>
              </div>
              <div className="p-2 border rounded bg-gray-900 text-white dark:bg-gray-900 dark:text-white">
                <div className="text-xs text-gray-500">全体消費トークン数</div>
                <div className="text-2xl font-bold">{usage.total._sum.tokens}</div>
              </div>
              <div className="p-2 border rounded bg-gray-900 text-white dark:bg-gray-900 dark:text-white">
                <div className="text-xs text-gray-500">全体APIコスト(USD)</div>
                <div className="text-2xl font-bold">{usage.total._sum.cost?.toFixed(4)}</div>
              </div>
            </div>
            <h3 className="font-semibold mt-4 mb-1">ユーザーごとの集計</h3>
            <div className="overflow-x-auto">
              <table className="min-w-[700px] border">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-2 py-1 border">UserID</th>
                    <th className="px-2 py-1 border">User</th>
                    <th className="px-2 py-1 border">回数</th>
                    <th className="px-2 py-1 border">トークン数</th>
                    <th className="px-2 py-1 border">コスト(USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.userStats.map((u: any) => {
                    const userObj = users.find((usr: any) => usr.id === u.userId);
                    return (
                      <tr key={u.userId || 'unknown'}>
                        <td className="border px-2 py-1">{u.userId || <span className="text-gray-400">未ログイン</span>}</td>
                        <td className="border px-2 py-1">{userObj ? `${userObj.name || ''} ${userObj.email ? `<${userObj.email}>` : ''}` : <span className="text-gray-400">不明</span>}</td>
                        <td className="border px-2 py-1">{u._count._all}</td>
                        <td className="border px-2 py-1">{u._sum.tokens}</td>
                        <td className="border px-2 py-1">{u._sum.cost?.toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <h3 className="font-semibold mt-4 mb-1 flex items-center gap-4">ユーザーごとの集計
              <button
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                onClick={exportUserStatsCsv}
              >CSVエクスポート</button>
            </h3>
            <div className="overflow-x-auto max-h-80">
              <table className="min-w-[900px] border text-xs">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-2 py-1 border">日時</th>
                    <th className="px-2 py-1 border">User</th>
                    <th className="px-2 py-1 border">API種別</th>
                    <th className="px-2 py-1 border">トークン数</th>
                    <th className="px-2 py-1 border">コスト</th>
                    <th className="px-2 py-1 border">入力</th>
                    <th className="px-2 py-1 border">結果</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.logs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="border px-2 py-1 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="border px-2 py-1">{log.user?.name || log.user?.email || log.userId || <span className="text-gray-400">未ログイン</span>}</td>
                      <td className="border px-2 py-1">{log.apiType}</td>
                      <td className="border px-2 py-1">{log.tokens}</td>
                      <td className="border px-2 py-1">{log.cost?.toFixed(4)}</td>
                      <td className="border px-2 py-1 max-w-[200px] truncate">{log.inputText}</td>
                      <td className="border px-2 py-1 max-w-[200px] truncate">
                        {(() => {
                          try {
                            const parsed = typeof log.result === 'string' ? JSON.parse(log.result) : log.result;
                            if (parsed && parsed.translations && Array.isArray(parsed.translations)) {
                              return parsed.translations.map((t: any, idx: number) => (
                                <div key={idx} className="mb-1">
                                  <div className="font-bold text-xs">{t.lang}</div>
                                  {Array.isArray(t.summary) && t.summary.length > 0 ? (
                                    <pre className="whitespace-pre-wrap text-xs" style={{ color: 'var(--foreground)' }}>{typeof t.summary[0] === 'string' ? t.summary.join('\n') : ''}</pre>
                                  ) : (
                                    <span className="text-xs" style={{ color: 'var(--foreground)' }}>{t.text}</span>
                                  )}
                                </div>
                              ));
                            }
                            return <span className="text-xs" style={{ color: 'var(--foreground)' }}>{log.result}</span>;
                          } catch {
                            return <span className="text-xs" style={{ color: 'var(--foreground)' }}>{log.result}</span>;
                          }
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* --- 利用履歴全体リセット --- */}
      <div className="mt-4 mb-2">
        <button
          className="px-4 py-2 bg-red-700 text-white rounded font-bold"
          onClick={() => handleResetUsage()}
          disabled={loading}
        >全ユーザーの利用履歴をリセット</button>
      </div>

      {/* --- 設定値編集（既存） --- */}
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

      {/* --- ユーザー一覧・会員種別管理 --- */}
      <section className="mt-12">
        <h2 className="font-bold mb-2">ユーザー一覧・会員種別管理</h2>
        {users.length === 0 ? (
          <div>ユーザー情報を取得中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] border">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-2 py-1 border">ID</th>
                  <th className="px-2 py-1 border">名前</th>
                  <th className="px-2 py-1 border">メール</th>
                  <th className="px-2 py-1 border">会員種別</th>
                  <th className="px-2 py-1 border">plan</th>
                  <th className="px-2 py-1 border">登録日</th>
                  <th className="px-2 py-1 border">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="border px-2 py-1 text-xs">{u.id}</td>
                    <td className="border px-2 py-1">{u.name}</td>
                    <td className="border px-2 py-1">{u.email}</td>
                    <td className="border px-2 py-1">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="border rounded px-1 py-0.5"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="special">Special</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="border px-2 py-1">{u.plan}</td>
                    <td className="border px-2 py-1 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="border px-2 py-1">
                      <button
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                        onClick={() => handleResetUsage(u.id)}
                        disabled={loading}
                      >リセット</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userMsg && <div className="mt-2 text-green-600">{userMsg}</div>}
          </div>
        )}
      </section>

      {/* --- リリースノート編集 --- */}
      <section className="mt-12 max-w-2xl">
        <h2 className="font-bold mb-2">新規リリースノート</h2>
        <div className="mb-2">
          <input type="text" placeholder="タイトル（任意）" className="border px-2 py-1 rounded w-full mb-2 text-foreground bg-background" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} />
          <textarea placeholder="本文（日本語）" className="border px-2 py-1 rounded w-full mb-2 text-foreground bg-background" value={noteForm.content_ja} onChange={e => setNoteForm(f => ({ ...f, content_ja: e.target.value }))} rows={2} />
          <button className="px-4 py-1 bg-blue-600 text-white rounded" onClick={async () => {
            setNoteMsg('');
            let title_en = '', title_th = '', content_en = '', content_th = '';
            if (noteForm.title || noteForm.content_ja) {
              try {
                const gptRes = await fetch('/api/gpt-translate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jaTitle: noteForm.title,
                    jaBody: noteForm.content_ja,
                    to: ['en', 'th']
                  })
                });
                if (gptRes.ok) {
                  const gptData = await gptRes.json();
                  if (noteForm.title) {
                    title_en = gptData.en?.title || '';
                    title_th = gptData.th?.title || '';
                  }
                  if (noteForm.content_ja) {
                    content_en = gptData.en?.body || '';
                    content_th = gptData.th?.body || '';
                  }
                }
              } catch {}
            }
            const res = await fetch('/api/release-notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: noteForm.title,
                title_en,
                title_th,
                content_ja: noteForm.content_ja,
                content_en,
                content_th
              })
            });
            if (res.ok) {
              setNoteMsg('追加しました');
              setNoteForm({ title: '', content_ja: '', content_en: '', content_th: '', isEdit: false });
              fetchNotes();
            } else {
              const err = await res.json();
              setNoteMsg('追加に失敗: ' + (err.error || ''));
            }
          }}>作成</button>
          {noteMsg && <div className="text-sm mt-1 text-red-600">{noteMsg}</div>}
        </div>
        <div>
          <h3 className="font-semibold mt-4 mb-2">既存リリースノート一覧</h3>
          <ul className="space-y-2">
            {notes.map(note => (
              <li key={note.id} className="border rounded p-3 bg-background text-foreground">
                <div className="text-xs text-gray-500 mb-1">{note.createdAt?.slice(0,10)}
                  {note.title_en && <span className="ml-2 font-bold">[EN] {note.title_en}</span>}
                  {note.title && <span className="ml-2 font-bold">[JA] {note.title}</span>}
                  {note.title_th && <span className="ml-2 font-bold">[TH] {note.title_th}</span>}
                </div>
                <div className="mb-1"><span className="font-bold">[EN]</span> {note.content_en}</div>
                <div className="mb-1"><span className="font-bold">[JA]</span> {note.content_ja}</div>
                <div><span className="font-bold">[TH]</span> {note.content_th}</div>
                <button className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs" onClick={() => setNoteForm({ ...note, isEdit: true })}>編集</button>
                <button className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-xs" onClick={async () => {
                  if (!confirm('本当に削除しますか？')) return;
                  await fetch('/api/release-notes', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: note.id })
                  });
                  fetchNotes();
                }}>削除</button>
              </li>
            ))}
          </ul>
        </div>
        {noteForm.isEdit && (
          <div className="mb-4 p-4 border rounded bg-gray-50 dark:bg-gray-800">
            <h4 className="font-bold mb-2">リリースノート編集</h4>
            <input type="text" placeholder="タイトル（任意）" className="border px-2 py-1 rounded w-full mb-2" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} />
            <textarea placeholder="本文（日本語）" className="border px-2 py-1 rounded w-full mb-2" value={noteForm.content_ja} onChange={e => setNoteForm(f => ({ ...f, content_ja: e.target.value }))} rows={2} />
            <textarea placeholder="Body (English)" className="border px-2 py-1 rounded w-full mb-2" value={noteForm.content_en} onChange={e => setNoteForm(f => ({ ...f, content_en: e.target.value }))} rows={2} />
            <textarea placeholder="เนื้อหา (ภาษาไทย)" className="border px-2 py-1 rounded w-full mb-2" value={noteForm.content_th} onChange={e => setNoteForm(f => ({ ...f, content_th: e.target.value }))} rows={2} />
            <div className="flex gap-2">
              <button className="px-4 py-1 bg-blue-600 text-white rounded" onClick={async () => {
                setNoteMsg('');
                const res = await fetch(`/api/release-notes`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(noteForm),
                });
                if (res.ok) {
                  setNoteMsg('編集しました');
                  setNoteForm({ title: '', content_ja: '', content_en: '', content_th: '', isEdit: false });
                  fetchNotes();
                } else {
                  const err = await res.json();
                  setNoteMsg('編集に失敗: ' + (err.error || ''));
                }
              }}>保存</button>
              <button className="px-4 py-1 bg-gray-400 text-white rounded" onClick={() => setNoteForm({ title: '', content_ja: '', content_en: '', content_th: '', isEdit: false })}>キャンセル</button>
            </div>
            {noteMsg && <div className="text-sm mt-1 text-red-600">{noteMsg}</div>}
          </div>
        )}
      </section>
      
      {/* フッターとの重複を避けるためのパディング */}
      <div className="pb-32"></div>

      {/* --- Aboutページ編集 --- */}
      <section className="mt-8 mb-8 pb-32">
        <h2 className="font-bold mb-2">Aboutページ編集</h2>
        <div className="mb-2 flex gap-2">
          {(['ja','en','th'] as const).map(l => (
            <button key={l} className={`px-3 py-1 rounded ${aboutLang===l?'bg-blue-600 text-white':'bg-background text-foreground border'}`} onClick={()=>setAboutLang(l)}>
              {l==='ja'?'日本語':l==='en'?'English':'ไทย'}
            </button>
          ))}
        </div>
        <div style={{height:300, overflowY:'auto', marginBottom:8}}>
          <ReactQuill 
            theme="snow" 
            value={about[`content_${aboutLang}`]||''} 
            onChange={v=>setAbout((prev:any)=>({...prev,[`content_${aboutLang}`]:v}))}
          />
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSaveAbout}>保存</button>
        <span className="ml-4 text-sm text-green-600">{aboutMsg}</span>
      </section>
    </div>
  );
} 