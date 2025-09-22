import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

export default function Admin() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orientation, setOrientation] = useState('landscape');
  const [duration, setDuration] = useState('0');
  const [items, setItems] = useState([]);

  const hasToken = Boolean(token);

  const qs = useMemo(() => (hasToken ? `?token=${encodeURIComponent(token)}` : ''), [token, hasToken]);

  async function refresh() {
    if (!hasToken) return;
    const res = await fetch(`/api/admin/list${qs}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    } else {
      setItems([]);
    }
  }

  useEffect(() => {
    refresh();
  }, [qs]);

  async function onUpload(e) {
    e.preventDefault();
    if (!file || !title || !hasToken) return;
    const urlRes = await fetch(`/api/admin/upload-url${qs}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentType: file.type || 'video/mp4' })
    });
    if (!urlRes.ok) { alert('Failed to request upload URL'); return; }
    const { url, pathname } = await urlRes.json();
    const putRes = await fetch(url, { method: 'PUT', body: file });
    if (!putRes.ok) { alert('Upload failed'); return; }
    const slug = (title || file.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uploaded = await putRes.json();
    await fetch(`/api/admin/register${qs}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        title,
        description,
        url: uploaded.url || uploaded.downloadUrl || uploaded.pathname || pathname,
        durationSeconds: Number(duration) || 0,
        orientation
      })
    });
    setFile(null); setTitle(''); setDescription(''); setDuration('0');
    refresh();
  }

  async function onDelete(item) {
    const body = item.url ? { url: item.url } : { pathname: item.pathname };
    await fetch(`/api/admin/delete${qs}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    refresh();
  }

  return (
    <>
      <Head><title>Admin · Uploads</title></Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6">
        <main className="mx-auto w-full max-w-2xl space-y-8">
          <header className="flex items-center justify-between">
            <h1 className="bg-gradient-to-r from-indigo-200 via-white to-pink-200 bg-clip-text text-2xl font-extrabold text-transparent">LAFFY Admin</h1>
            <div className="flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              <span className="uppercase tracking-[0.3em]">{hasToken ? 'ACCESS' : 'LOCKED'}</span>
            </div>
          </header>

          {!hasToken && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p className="font-semibold">Token required</p>
              <p className="mt-1">Append <code className="rounded bg-black/30 px-1">?token=YOUR_ADMIN_TOKEN</code> to the URL to access.</p>
            </div>
          )}

          <form onSubmit={onUpload} className="space-y-4 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800/70">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Video File</label>
                <input disabled={!hasToken} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Title</label>
                <input disabled={!hasToken} type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Duration (s)</label>
                <input disabled={!hasToken} type="number" min="0" placeholder="0" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Orientation</label>
                <select disabled={!hasToken} value={orientation} onChange={(e) => setOrientation(e.target.value)} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40">
                  <option value="landscape">landscape</option>
                  <option value="portrait">portrait</option>
                  <option value="square">square</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Description</label>
                <input disabled={!hasToken} type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40" />
              </div>
            </div>
            <button disabled={!hasToken} className="rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-5 py-2 text-sm font-semibold shadow-lg disabled:opacity-50">Upload</button>
          </form>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Uploaded</h2>
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.pathname} className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2 text-sm ring-1 ring-slate-800/70">
                  <span className="truncate text-slate-200">{it.pathname}</span>
                  <div className="flex gap-2">
                    <a href={it.url} target="_blank" rel="noreferrer" className="rounded-full bg-slate-800 px-3 py-1 hover:bg-slate-700">Open</a>
                    <button disabled={!hasToken} onClick={() => onDelete(it)} className="rounded-full bg-rose-600 px-3 py-1 hover:bg-rose-500 disabled:opacity-50">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}

