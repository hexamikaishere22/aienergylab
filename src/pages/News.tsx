import { useCallback, useEffect, useMemo, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Tipe dan pembacaan data                                             */
/* ------------------------------------------------------------------ */

type Topic = 'ai' | 'energi';
type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceId: string;
  publishedAt: string;
  summary: string;
  topics: Topic[];
};
type NewsSource = { id: string; name: string; ok: boolean; total: number; matched: number; error: string | null };
type NewsData = { generatedAt: string | null; checkedAt: string | null; sources: NewsSource[]; items: NewsItem[] };

const SAFE_URL = /^https?:\/\//i;
const PAGE_SIZE = 20;
const REFRESH_MS = 10 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

// Data berasal dari berkas JSON yang dibuat skrip, jadi tetap divalidasi sebelum ditampilkan.
function parseNews(raw: unknown): NewsData {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const items: NewsItem[] = [];
  if (Array.isArray(obj.items)) {
    for (const entry of obj.items) {
      if (!entry || typeof entry !== 'object') continue;
      const r = entry as Record<string, unknown>;
      const pub = r.publishedAt;
      if (typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.url !== 'string' || !SAFE_URL.test(r.url)) continue;
      if (typeof pub !== 'string' || Number.isNaN(Date.parse(pub))) continue;
      items.push({
        id: r.id,
        title: r.title,
        url: r.url,
        source: typeof r.source === 'string' ? r.source : 'Sumber',
        sourceId: typeof r.sourceId === 'string' ? r.sourceId : '',
        publishedAt: pub,
        summary: typeof r.summary === 'string' ? r.summary : '',
        topics: Array.isArray(r.topics) ? r.topics.filter((t): t is Topic => t === 'ai' || t === 'energi') : [],
      });
    }
  }
  const sources: NewsSource[] = [];
  if (Array.isArray(obj.sources)) {
    for (const entry of obj.sources) {
      if (!entry || typeof entry !== 'object') continue;
      const r = entry as Record<string, unknown>;
      if (typeof r.id !== 'string' || typeof r.name !== 'string') continue;
      sources.push({
        id: r.id,
        name: r.name,
        ok: r.ok === true,
        total: typeof r.total === 'number' ? r.total : 0,
        matched: typeof r.matched === 'number' ? r.matched : 0,
        error: typeof r.error === 'string' ? r.error : null,
      });
    }
  }
  return {
    generatedAt: typeof obj.generatedAt === 'string' ? obj.generatedAt : null,
    checkedAt: typeof obj.checkedAt === 'string' ? obj.checkedAt : null,
    sources,
    items,
  };
}

/* ------------------------------------------------------------------ */
/* Format waktu                                                        */
/* ------------------------------------------------------------------ */

const MIN = 60_000;
function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, now - Date.parse(iso));
  if (diff < MIN) return 'baru saja';
  if (diff < 60 * MIN) return `${Math.floor(diff / MIN)} menit lalu`;
  if (diff < 24 * 60 * MIN) return `${Math.floor(diff / (60 * MIN))} jam lalu`;
  const days = Math.floor(diff / (24 * 60 * MIN));
  if (days < 7) return `${days} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}
const clock = (iso: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const fullDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
function dayLabel(iso: string, now: number): string {
  if (dayKey(iso) === dayKey(new Date(now).toISOString())) return 'Hari ini';
  if (dayKey(iso) === dayKey(new Date(now - 86400000).toISOString())) return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/* ------------------------------------------------------------------ */
/* Gaya                                                                */
/* ------------------------------------------------------------------ */

const NEWS_STYLES = `
.news-toolbar { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.news-tabs { display: inline-flex; padding: 3px; gap: 2px; border: 1px solid hsl(var(--border)); border-radius: 999px; background: hsl(var(--secondary) / .6); max-width: 100%; }
.news-tabs button { border: 0; background: transparent; color: hsl(var(--muted-foreground)); font: inherit; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
.news-tabs button[aria-pressed="true"] { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
.news-tabs button:focus-visible, .news-chip:focus-visible, .news-btn:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.news-tabs small { opacity: .75; margin-left: 4px; font-weight: 500; }
.news-search { flex: 1 1 240px; max-width: 380px; min-width: 0; font: inherit; font-size: 14px; padding: 10px 14px; min-height: 42px; border-radius: 999px; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); color: hsl(var(--foreground)); }
.news-search:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.news-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.news-chip { font: inherit; font-size: 12px; padding: 8px 14px; min-height: 36px; border-radius: 999px; border: 1px solid hsl(var(--border)); background: transparent; color: hsl(var(--foreground)); cursor: pointer; }
.news-chip[aria-pressed="true"] { background: hsl(var(--primary) / .14); border-color: hsl(var(--primary)); color: hsl(var(--primary)); font-weight: 600; }
.news-chip small { opacity: .7; margin-left: 5px; }
.news-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 4px; }
.news-warn { margin: 10px 0 0; padding: 10px 14px; border-radius: 10px; border: 1px solid #d9a441; background: color-mix(in srgb, #d9a441 14%, transparent); font-size: 13px; line-height: 1.5; }
.news-sources { margin-top: 8px; font-size: 12px; color: hsl(var(--muted-foreground)); }
.news-sources summary { cursor: pointer; width: fit-content; }
.news-sources ul { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 4px; }
.news-sources .bad { color: hsl(var(--destructive)); }
.news-day { font: 500 11px var(--app-font-mono); letter-spacing: .12em; text-transform: uppercase; color: hsl(var(--muted-foreground)); margin: 24px 0 10px; }
.news-list { display: grid; gap: 12px; }
.news-card { padding: 16px 18px; display: grid; gap: 8px; min-width: 0; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 18px; transition: border-color .2s, background-color .25s; }
.news-card:hover { border-color: hsl(var(--primary) / .5); }
.news-card-top { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; font-size: 12px; color: hsl(var(--muted-foreground)); }
.news-source { font-weight: 700; color: hsl(var(--foreground)); }
.news-card h3 { margin: 0; font: 600 17px/1.35 var(--app-font-display); letter-spacing: -.02em; overflow-wrap: anywhere; }
.news-card h3 a { color: inherit; text-decoration: none; }
.news-card h3 a:hover { text-decoration: underline; text-underline-offset: 3px; }
.news-card h3 a:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 3px; border-radius: 4px; }
.news-card p { margin: 0; color: hsl(var(--muted-foreground)); font-size: 14px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.news-read { font-size: 12px; font-weight: 600; color: hsl(var(--primary)); text-decoration: none; width: fit-content; }
.news-read:hover { text-decoration: underline; text-underline-offset: 3px; }
.news-more { text-align: center; margin-top: 18px; }
.news-btn { font: inherit; font-size: 13px; padding: 10px 18px; min-height: 42px; border-radius: 999px; border: 1px solid hsl(var(--border)); background: transparent; color: inherit; cursor: pointer; }
.news-btn:hover { border-color: hsl(var(--primary)); }
.news-empty { padding: 28px 20px; border: 1px dashed hsl(var(--border)); border-radius: 14px; text-align: center; color: hsl(var(--muted-foreground)); line-height: 1.6; font-size: 14px; }
.news-note { margin-top: 26px; font-size: 11px; line-height: 1.6; color: hsl(var(--muted-foreground)); }
@media (max-width: 640px) {
  .news-tabs { width: 100%; }
  .news-tabs button { flex: 1 1 0; padding: 9px 8px; }
  .news-search { max-width: none; width: 100%; }
  .news-chip { min-height: 40px; }
  .news-card { padding: 14px; }
  .news-card h3 { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) { .news-card { transition: none; } }
`;

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */

type Tab = 'all' | 'energi';

export default function News() {
  const [data, setData] = useState<NewsData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tab, setTab] = useState<Tab>('all');
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (quiet: boolean) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}news.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(parseNews(await res.json()));
      setStatus('ready');
    } catch {
      // Saat penyegaran diam-diam gagal, tetap tampilkan data yang sudah ada.
      if (!quiet) setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load(false);
    const refresh = setInterval(() => void load(true), REFRESH_MS);
    const clockTick = setInterval(() => setNow(Date.now()), MIN);
    return () => {
      clearInterval(refresh);
      clearInterval(clockTick);
    };
  }, [load]);

  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [tab, picked, query]);

  const items = data?.items ?? [];
  const energyCount = useMemo(() => items.filter((i) => i.topics.includes('energi')).length, [items]);
  const sourceCounts = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    items.forEach((i) => {
      const key = i.sourceId || i.source;
      const cur = map.get(key);
      map.set(key, { name: i.source, count: (cur?.count ?? 0) + 1 });
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (tab === 'energi' && !i.topics.includes('energi')) return false;
      if (picked.length > 0 && !picked.includes(i.sourceId || i.source)) return false;
      if (q && !`${i.title} ${i.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, picked, query]);

  const visible = filtered.slice(0, shown);
  const groups: Array<{ key: string; label: string; list: NewsItem[] }> = [];
  visible.forEach((item) => {
    const key = dayKey(item.publishedAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.list.push(item);
    else groups.push({ key, label: dayLabel(item.publishedAt, now), list: [item] });
  });

  const togglePick = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const generated = data?.generatedAt ?? null;
  const stale = generated !== null && now - Date.parse(generated) > STALE_MS;
  const okSources = data ? data.sources.filter((s) => s.ok).length : 0;
  const filtering = tab !== 'all' || picked.length > 0 || query.trim() !== '';

  return (
    <div className="page fade-in">
      <style>{NEWS_STYLES}</style>

      <header className="page-head">
        <div>
          <div className="eyebrow">BERITA HARIAN</div>
          <h1>Berita AI terbaru</h1>
          <p>
            Kumpulan berita kecerdasan buatan dari media berbahasa Indonesia, diperbarui otomatis.
            Tab “Energi AI” memuat berita tentang pusat data dan kebutuhan listriknya.
          </p>
        </div>
        <span className="fact-tag">OTOMATIS</span>
      </header>

      {status === 'loading' && <div className="news-empty" role="status">Memuat berita…</div>}

      {status === 'error' && (
        <div className="news-empty" role="alert">
          Berita belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.
          <div style={{ marginTop: 14 }}>
            <button type="button" className="news-btn" onClick={() => { setStatus('loading'); void load(false); }}>Coba lagi</button>
          </div>
        </div>
      )}

      {status === 'ready' && data && (
        <>
          <div className="news-toolbar">
            <div className="news-tabs" role="group" aria-label="Pilih kategori berita">
              <button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')} data-testid="news-tab-all">
                Semua berita AI<small>{items.length}</small>
              </button>
              <button type="button" aria-pressed={tab === 'energi'} onClick={() => setTab('energi')} data-testid="news-tab-energi">
                Energi AI<small>{energyCount}</small>
              </button>
            </div>
            <input
              className="news-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari judul atau ringkasan…"
              aria-label="Cari berita"
              data-testid="news-search"
            />
          </div>

          {sourceCounts.length > 1 && (
            <div className="news-chips" role="group" aria-label="Saring menurut sumber">
              {sourceCounts.map((s) => (
                <button key={s.id} type="button" className="news-chip" aria-pressed={picked.includes(s.id)} onClick={() => togglePick(s.id)} data-testid={`news-source-${s.id}`}>
                  {s.name}<small>{s.count}</small>
                </button>
              ))}
              {picked.length > 0 && (
                <button type="button" className="news-chip" onClick={() => setPicked([])}>Hapus saringan sumber</button>
              )}
            </div>
          )}

          <div className="news-meta">
            {generated ? (
              <span title={fullDate(generated)}>Diperbarui {relativeTime(generated, now)}</span>
            ) : (
              <span>Belum pernah diperbarui</span>
            )}
            <span role="status" aria-live="polite">
              {filtering ? `${filtered.length} dari ${items.length} berita` : `${items.length} berita`}
            </span>
          </div>

          {stale && (
            <p className="news-warn" role="note">
              Data terakhir diperbarui lebih dari 24 jam lalu, jadi berita terbaru mungkin belum muncul.
            </p>
          )}

          {data.sources.length > 0 && (
            <details className="news-sources">
              <summary>Status sumber ({okSources} dari {data.sources.length} aktif)</summary>
              <ul>
                {data.sources.map((s) => (
                  <li key={s.id} className={s.ok ? '' : 'bad'}>
                    {s.ok ? '✓' : '✕'} {s.name}
                    {s.ok ? ` · ${s.matched} berita relevan dari ${s.total}` : ` · gagal diambil${s.error ? ` (${s.error})` : ''}`}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {filtered.length === 0 ? (
            <div className="news-empty" style={{ marginTop: 18 }}>
              {items.length === 0
                ? 'Belum ada berita yang tersedia. Berita akan muncul otomatis setelah pembaruan berikutnya.'
                : 'Tidak ada berita yang cocok dengan saringanmu.'}
              {filtering && items.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <button type="button" className="news-btn" onClick={() => { setTab('all'); setPicked([]); setQuery(''); }}>Hapus semua saringan</button>
                </div>
              )}
            </div>
          ) : (
            <>
              {groups.map((g) => (
                <section key={g.key} aria-label={g.label}>
                  <div className="news-day">{g.label}</div>
                  <div className="news-list">
                    {g.list.map((item) => (
                      <article key={item.id} className="news-card" data-testid="news-item">
                        <div className="news-card-top">
                          <span className="news-source">{item.source}</span>
                          <span title={fullDate(item.publishedAt)}>{clock(item.publishedAt)} · {relativeTime(item.publishedAt, now)}</span>
                          {item.topics.includes('energi') && <span className="assumption-tag">ENERGI AI</span>}
                        </div>
                        <h3>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                        </h3>
                        {item.summary && <p>{item.summary}</p>}
                        <a className="news-read" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Baca selengkapnya di ${item.source}: ${item.title}`}>
                          Baca di {item.source} ↗
                        </a>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              {filtered.length > shown && (
                <div className="news-more">
                  <button type="button" className="news-btn" onClick={() => setShown((n) => n + PAGE_SIZE)} data-testid="news-more">
                    Tampilkan lebih banyak ({filtered.length - shown} lagi)
                  </button>
                </div>
              )}
            </>
          )}

          <p className="news-note">
            Halaman ini hanya menampilkan judul, ringkasan singkat dari feed RSS, dan tautan ke artikel asli. Hak cipta isi berita
            dimiliki masing-masing penerbit; klik tautan untuk membaca berita lengkapnya di situs sumber.
          </p>
        </>
      )}
    </div>
  );
}
