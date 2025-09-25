import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ClientBlobUploader from '../components/ClientBlobUploader';

export default function Admin() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orientation, setOrientation] = useState('landscape');
  const [duration, setDuration] = useState('0');
  const [items, setItems] = useState([]);
  const [copiedSlug, setCopiedSlug] = useState('');
  const [view, setView] = useState('uploads');
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  const copyTimeoutRef = useRef(null);
  const pendingMetricsRef = useRef(new Set());

  const hasToken = Boolean(token);
  const qs = useMemo(() => (hasToken ? `?token=${encodeURIComponent(token)}` : ''), [token, hasToken]);
  const numberFormatter = useMemo(() => new Intl.NumberFormat('ko-KR'), []);

  const navItems = useMemo(
    () => [
      { key: 'uploads', label: '업로드 · 목록', requiresToken: false },
      { key: 'analytics', label: '분석', requiresToken: true },
    ],
    []
  );

  const refresh = useCallback(async () => {
    if (!hasToken) return;
    try {
      const res = await fetch(`/api/admin/list${qs}`);
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      const baseItems = Array.isArray(data.items) ? data.items : [];
      const enriched = await Promise.all(
        baseItems.map(async (it) => {
          try {
            const metaRes = await fetch(it.url);
            if (!metaRes.ok) return { ...it, _error: true };
            const meta = await metaRes.json();
            const slug = meta?.slug || it.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            const type = (meta?.type || '').toLowerCase();
            const preview = meta?.thumbnail || meta?.poster || '';
            const routePath = type === 'image' ? `/x/${slug}` : `/m/${slug}`;
            const titleValue = meta?.title || slug;
            return { ...it, slug, type, preview, routePath, title: titleValue };
          } catch {
            const slug = it.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            return { ...it, slug, _error: true };
          }
        })
      );
      setItems(enriched);
    } catch {
      setItems([]);
    }
  }, [hasToken, qs]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!hasToken) return undefined;
    const interval = setInterval(() => { refresh(); }, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hasToken, refresh]);

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!hasToken && view === 'analytics') setView('uploads');
  }, [hasToken, view]);

  useEffect(() => {
    setMetricsBySlug((prev) => {
      if (!prev || typeof prev !== 'object') return {};
      const next = {};
      items.forEach((item) => {
        if (item.slug && prev[item.slug]) next[item.slug] = prev[item.slug];
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])
      ) {
        return prev;
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!hasToken || view !== 'analytics') return undefined;
    const slugs = items.map((it) => it.slug).filter(Boolean);
    const pendingSet = pendingMetricsRef.current;
    const fetchTargets = slugs.filter((slug) => !metricsBySlug[slug] && !pendingSet.has(slug));
    if (!fetchTargets.length) {
      setMetricsLoading(false);
      return undefined;
    }

    fetchTargets.forEach((slug) => pendingSet.add(slug));
    let cancelled = false;

    setMetricsLoading(true);
    setMetricsError(null);

    (async () => {
      try {
        const results = await Promise.all(
          fetchTargets.map(async (slug) => {
            const res = await fetch(`/api/metrics/get?slug=${encodeURIComponent(slug)}`);
            if (!res.ok) {
              throw new Error('metrics_error');
            }
            const data = await res.json();
            return {
              slug,
              metrics: {
                views: Number(data?.views) || 0,
                likes: Math.max(0, Number(data?.likes) || 0),
              },
            };
          })
        );
        if (cancelled) return;
        setMetricsBySlug((prev) => {
          const next = { ...prev };
          results.forEach(({ slug, metrics }) => {
            next[slug] = metrics;
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) setMetricsError('메트릭을 불러오지 못했어요.');
      } finally {
        fetchTargets.forEach((slug) => pendingSet.delete(slug));
        if (!cancelled) setMetricsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      fetchTargets.forEach((slug) => pendingSet.delete(slug));
      setMetricsLoading(false);
    };
  }, [hasToken, view, items, metricsBySlug]);

  const formatNumber = useCallback(
    (value) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return '0';
      return numberFormatter.format(value);
    },
    [numberFormatter]
  );

  const analyticsRows = useMemo(
    () =>
      items
        .filter((it) => it.slug)
        .map((it) => ({
          ...it,
          metrics: metricsBySlug[it.slug] || null,
        })),
    [items, metricsBySlug]
  );

  const sortedAnalyticsRows = useMemo(
    () =>
      [...analyticsRows].sort((a, b) => {
        const aViews = a.metrics?.views ?? 0;
        const bViews = b.metrics?.views ?? 0;
        return bViews - aViews;
      }),
    [analyticsRows]
  );

  const analyticsTotals = useMemo(
    () =>
      analyticsRows.reduce(
        (acc, row) => {
          if (!row.metrics) return acc;
          return {
            views: acc.views + (row.metrics.views || 0),
            likes: acc.likes + (row.metrics.likes || 0),
          };
        },
        { views: 0, likes: 0 }
      ),
    [analyticsRows]
  );

  const averageLikeRate = useMemo(() => {
    const withViews = analyticsRows.filter((row) => row.metrics && row.metrics.views > 0);
    if (!withViews.length) return 0;
    const totalRate = withViews.reduce((acc, row) => acc + row.metrics.likes / row.metrics.views, 0);
    return totalRate / withViews.length;
  }, [analyticsRows]);

  const formatPercent = useCallback((value) => {
    if (!Number.isFinite(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
  }, []);

  async function generateSlug(blob) {
    const raw = `${blob?.pathname || ''}-${blob?.url || ''}-${Date.now()}-${Math.random()}`;
    const cryptoObj = globalThis.crypto;

    if (cryptoObj?.subtle && typeof TextEncoder !== 'undefined') {
      const encoder = new TextEncoder();
      const digest = await cryptoObj.subtle.digest('SHA-256', encoder.encode(raw));
      const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
      return hex.slice(0, 16);
    }

    if (typeof cryptoObj?.randomUUID === 'function') {
      return cryptoObj.randomUUID().replace(/-/g, '').slice(0, 16);
    }

    return raw
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16) || `slug-${Date.now()}`;
  }

  async function registerMeta(blob) {
    const slug = await generateSlug(blob);
    const contentType = typeof blob?.contentType === 'string' ? blob.contentType : '';
    const pathname = typeof blob?.pathname === 'string' ? blob.pathname : '';
    const lowerPathname = pathname.toLowerCase();
    const lowerUrl = typeof blob?.url === 'string' ? blob.url.toLowerCase() : '';
    const imageExtPattern = /(\.jpe?g|\.png|\.webp)$/;
    const hasImageExtension = imageExtPattern.test(lowerPathname) || imageExtPattern.test(lowerUrl);
    const isImage = contentType.startsWith('image/') || hasImageExtension;
    const normalizedType = isImage ? 'image' : 'video';

    const res = await fetch(`/api/admin/register${qs}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        title,
        description,
        url: blob.url,
        durationSeconds: isImage ? 0 : Number(duration) || 0,
        orientation,
        type: normalizedType,
        poster: isImage ? blob.url : null,
        thumbnail: isImage ? blob.url : null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`메타 저장 실패: ${err.error || res.status}`);
      return;
    }
    setTitle('');
    setDescription('');
    setDuration('0');
    refresh();
  }

  async function onDelete(item) {
    const body = item.url ? { url: item.url } : { pathname: item.pathname };
    await fetch(`/api/admin/delete${qs}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    refresh();
  }

  const uploadsVisible = view === 'uploads';
  const analyticsVisible = view === 'analytics';

  return (
    <>
      <Head><title>Admin · Laffy</title></Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6">
        <main className="mx-auto w-full max-w-5xl space-y-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="bg-gradient-to-r from-indigo-200 via-white to-pink-200 bg-clip-text text-3xl font-extrabold text-transparent">LAFFY Admin</h1>
            <div className="flex items-center gap-2 self-start rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              <span className="uppercase tracking-[0.3em]">{hasToken ? 'ACCESS' : 'LOCKED'}</span>
            </div>
          </header>

          <nav className="rounded-full bg-slate-900/60 p-1 shadow-inner shadow-black/40">
            <div className="grid grid-cols-2 gap-1">
              {navItems.map((item) => {
                const active = view === item.key;
                const disabled = item.requiresToken && !hasToken;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { if (!disabled) setView(item.key); }}
                    disabled={disabled}
                    aria-pressed={active}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${active ? 'bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30' : 'text-slate-400 hover:text-slate-100'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {!hasToken && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p className="font-semibold">토큰이 필요합니다</p>
              <p className="mt-1">URL 끝에 <code className="rounded bg-black/30 px-1">?token=YOUR_ADMIN_TOKEN</code> 을 붙여 접근해 주세요.</p>
            </div>
          )}

          <div className="relative min-h-[24rem]">
            <section
              className={`space-y-8 transition-all duration-200 ease-out ${uploadsVisible ? 'relative opacity-100' : 'absolute inset-0 -translate-y-2 opacity-0 pointer-events-none'}`}
            >
              <div className="space-y-4 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800/70">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Title</label>
                    <input
                      disabled={!hasToken}
                      type="text"
                      placeholder="Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Duration (s)</label>
                    <input
                      disabled={!hasToken}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Orientation</label>
                    <select
                      disabled={!hasToken}
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
                    >
                      <option value="landscape">landscape</option>
                      <option value="portrait">portrait</option>
                      <option value="square">square</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Description</label>
                    <input
                      disabled={!hasToken}
                      type="text"
                      placeholder="Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">Upload</label>
                  <ClientBlobUploader
                    handleUploadUrl={`/api/blob/upload${qs}`}
                    accept="image/jpeg,image/png,image/webp,video/mp4"
                    maxSizeMB={200}
                    onUploaded={(blob) => registerMeta(blob)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Uploaded</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((it) => {
                    const copied = copiedSlug === it.slug;
                    return (
                      <div key={it.pathname} className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
                        <div className="relative w-full aspect-video bg-slate-950/60">
                          {it.preview ? (
                            <img src={it.preview} alt={it.title || it.slug} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-slate-400">No preview</div>
                          )}
                          {it.type && (
                            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
                              {it.type}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 p-3 text-sm">
                          <div className="truncate font-semibold text-slate-100">{it.title || it.slug}</div>
                          <div className="truncate text-[12px] text-slate-400">{it.slug}</div>
                          <div className="flex items-center gap-2 pt-1">
                            {it.routePath && (
                              <>
                                <a
                                  href={it.routePath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-500"
                                >
                                  Open Route
                                </a>
                                <button
                                  onClick={async () => {
                                    try {
                                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                      const absoluteUrl = origin ? new URL(it.routePath, origin).toString() : it.routePath;
                                      const canUseClipboard = typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
                                      if (canUseClipboard) {
                                        await navigator.clipboard.writeText(absoluteUrl);
                                      } else if (typeof document !== 'undefined') {
                                        const textarea = document.createElement('textarea');
                                        textarea.value = absoluteUrl;
                                        textarea.setAttribute('readonly', '');
                                        textarea.style.position = 'absolute';
                                        textarea.style.left = '-9999px';
                                        document.body.appendChild(textarea);
                                        textarea.select();
                                        if (typeof document.execCommand === 'function') {
                                          document.execCommand('copy');
                                        } else {
                                          throw new Error('Clipboard API unavailable');
                                        }
                                        document.body.removeChild(textarea);
                                      }
                                      setCopiedSlug(it.slug);
                                      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                                      copyTimeoutRef.current = setTimeout(() => setCopiedSlug(''), 1800);
                                    } catch (e) {
                                      console.error('Copy failed', e);
                                    }
                                  }}
                                  className={`rounded-full px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${copied ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                                >
                                  {copied ? 'Copied ✨' : 'Copy'}
                                </button>
                                {copied && (
                                  <span className="sr-only" aria-live="polite">링크가 복사되었습니다.</span>
                                )}
                              </>
                            )}
                            <button
                              disabled={!hasToken}
                              onClick={() => onDelete(it)}
                              className="ml-auto rounded-full bg-rose-600 px-3 py-1 hover:bg-rose-500 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
                      아직 업로드된 콘텐츠가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section
              className={`space-y-6 transition-all duration-200 ease-out ${analyticsVisible ? 'relative opacity-100' : 'absolute inset-0 translate-y-2 opacity-0 pointer-events-none'}`}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">콘텐츠</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(items.length)}</p>
                  <p className="mt-1 text-xs text-slate-500">등록된 메타 파일 수</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 조회수</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(analyticsTotals.views)}</p>
                  <p className="mt-1 text-xs text-slate-500">metrics 기준 누적</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">평균 좋아요율</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatPercent(averageLikeRate)}</p>
                  <p className="mt-1 text-xs text-slate-500">조회가 있는 콘텐츠 평균</p>
                </div>
              </div>

              {metricsError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                  {metricsError}
                </div>
              )}

              <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800/70 text-sm">
                    <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">콘텐츠</th>
                        <th className="px-4 py-3 font-semibold">타입</th>
                        <th className="px-4 py-3 text-right font-semibold">조회수</th>
                        <th className="px-4 py-3 text-right font-semibold">좋아요</th>
                        <th className="px-4 py-3 text-right font-semibold">좋아요율</th>
                        <th className="px-4 py-3 text-right font-semibold">링크</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sortedAnalyticsRows.map((row) => {
                        const metrics = row.metrics;
                        const viewsDisplay = metrics ? formatNumber(metrics.views) : metricsLoading ? '불러오는 중…' : '—';
                        const likesDisplay = metrics ? formatNumber(metrics.likes) : metricsLoading ? '불러오는 중…' : '—';
                        const likeRateDisplay = metrics && metrics.views > 0 ? formatPercent(metrics.likes / metrics.views) : '—';
                        return (
                          <tr key={row.slug} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-100">{row.title || row.slug}</div>
                              <div className="text-xs text-slate-500">{row.slug}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-widest text-slate-300">
                                {row.type || 'unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-100">{viewsDisplay}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{likesDisplay}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{likeRateDisplay}</td>
                            <td className="px-4 py-3 text-right">
                              {row.routePath ? (
                                <a
                                  href={row.routePath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                                >
                                  열기
                                </a>
                              ) : (
                                <span className="text-xs text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {sortedAnalyticsRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                            분석할 콘텐츠가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {metricsLoading && (
                  <div className="border-t border-slate-800/70 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
                    메트릭을 불러오는 중입니다…
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
