#!/usr/bin/env node
/**
 * Pengambil berita AI dari feed RSS/Atom -> public/news.json
 *
 * Tanpa dependensi (butuh Node 18+). Cara pakai:
 *   npm run news
 *   node scripts/fetch-news.mjs --days 14 --max 300 --strict
 *
 * Opsi:
 *   --sources <file>  daftar sumber (default scripts/news-sources.json)
 *   --out <file>      berkas keluaran (default public/news.json)
 *   --days <n>        simpan berita sejauh n hari (default 14)
 *   --max <n>         batas jumlah berita tersimpan (default 300)
 *   --strict          keluar dengan kode 1 jika SEMUA sumber gagal (berguna untuk CI)
 *
 * Yang disimpan hanya judul, ringkasan singkat dari feed, sumber, waktu, dan tautan asli.
 * Isi artikel lengkap dan gambar tidak diambil.
 */
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));

/* ---------------- opsi baris perintah ---------------- */
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const SOURCES_FILE = path.resolve(opt('sources', path.join(here, 'news-sources.json')));
const OUT_FILE = path.resolve(opt('out', path.join(here, '..', 'public', 'news.json')));
const KEEP_DAYS = Math.max(1, Number(opt('days', 14)) || 14);
const MAX_ITEMS = Math.max(10, Number(opt('max', 300)) || 300);
const STRICT = args.includes('--strict');

const TIMEOUT_MS = 15000;
const MAX_BYTES = 5 * 1024 * 1024;
const CONCURRENCY = 3;
const SUMMARY_MAX = 220;
const USER_AGENT = 'AI-Energy-Lab-NewsBot/1.0 (proyek edukasi; hanya membaca RSS)';

/* ---------------- penyaring topik ---------------- */
// Kata kunci AI. Sebagian sengaja peka huruf besar-kecil (mis. "AI") agar tidak salah tangkap.
const AI_PATTERNS = [
  /\bkecerdasan buatan\b/i, /\bartificial intelligence\b/i, /\bAI\b/, /\bchat ?gpt\b/i, /\bopenai\b/i,
  /\bgoogle gemini\b/i, /\bcopilot\b/i, /\bdeepseek\b/i, /\bchatbot\b/i, /\bmachine learning\b/i,
  /\bdeep learning\b/i, /\bLLM\b/, /\bgeneratif\b/i, /\bgenerative\b/i, /\bnvidia\b/i, /\banthropic\b/i,
  /\bmodel bahasa\b/i, /\bagentic\b/i,
];
const ENERGY_RE = /\b(listrik|energi|emisi|karbon|PLN|PLTS|tenaga surya|nuklir|pendingin(an)?|megawatt|gigawatt|TWh|kWh|MW|GW|energy|electricity|power grid)\b/i;
const DATACENTER_RE = /\b(pusat data|data ?center)\b/i;

function classify(text) {
  const ai = AI_PATTERNS.some((re) => re.test(text));
  const dc = DATACENTER_RE.test(text);
  const energy = (ai && ENERGY_RE.test(text)) || (dc && ENERGY_RE.test(text));
  const topics = [];
  if (ai || dc) topics.push('ai');
  if (energy) topics.push('energi');
  return topics;
}

/* ---------------- pembantu teks/XML ---------------- */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, g) => {
    if (g[0] === '#') {
      const code = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    const v = NAMED[g.toLowerCase()];
    return v === undefined ? m : v;
  });
}
function cleanText(raw) {
  if (!raw) return '';
  let t = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  t = decodeEntities(t); // feed sering mengirim HTML yang di-encode
  t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(br|p|div|li|ul|ol|h[1-6]|tr|td|blockquote)\b[^>]*>/gi, ' ') // tag blok -> spasi
    .replace(/<[^>]+>/g, ''); // tag sebaris dibuang tanpa spasi
  t = decodeEntities(t);
  return t.replace(/\s+/g, ' ').trim();
}
function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}
function tagInner(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}
function atomLink(block) {
  const tags = block.match(/<link\b[^>]*>/gi) || [];
  let first = '';
  for (const tag of tags) {
    const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const rel = (tag.match(/rel\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!rel || rel === 'alternate') return decodeEntities(href);
    if (!first) first = decodeEntities(href);
  }
  return first;
}

/* ---------------- URL ---------------- */
function resolveUrl(raw, base) {
  try {
    const u = new URL(raw.trim(), base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}
function canonical(u) {
  const c = new URL(u.href);
  c.hash = '';
  for (const key of [...c.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|ref$|source$)/i.test(key)) c.searchParams.delete(key);
  }
  c.hostname = c.hostname.toLowerCase();
  let s = c.href;
  if (s.endsWith('/') && c.pathname !== '/') s = s.slice(0, -1);
  return s;
}
const idOf = (url) => createHash('sha1').update(url).digest('hex').slice(0, 12);

/* ---------------- parser RSS / Atom ---------------- */
function parseFeed(xml, feedUrl) {
  if (!/<(rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error('bukan RSS/Atom (alamat salah atau diblokir)');
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  const out = [];
  for (const block of blocks) {
    const title = cleanText(tagInner(block, 'title'));
    let linkRaw = cleanText(tagInner(block, 'link'));
    if (!linkRaw) linkRaw = atomLink(block);
    if (!linkRaw) {
      const guid = cleanText(tagInner(block, 'guid'));
      if (/^https?:\/\//i.test(guid)) linkRaw = guid;
    }
    const url = linkRaw ? resolveUrl(linkRaw, feedUrl) : null;
    if (!title || !url) continue;
    const dateRaw = cleanText(tagInner(block, 'pubDate') || tagInner(block, 'dc:date') || tagInner(block, 'published') || tagInner(block, 'updated'));
    const ts = Date.parse(dateRaw);
    const summaryRaw = tagInner(block, 'description') || tagInner(block, 'summary') || tagInner(block, 'content:encoded') || tagInner(block, 'content');
    let summary = cleanText(summaryRaw);
    if (summary.toLowerCase() === title.toLowerCase() || summary.toLowerCase().startsWith(title.toLowerCase())) {
      summary = summary.slice(title.length).replace(/^[\s:–—-]+/, '');
    }
    out.push({ title, url, ts: Number.isNaN(ts) ? null : ts, summary, summaryFull: summary });
  }
  return out;
}

/* ---------------- unduh ---------------- */
async function fetchText(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error('berkas terlalu besar');
    // deteksi encoding dari deklarasi XML atau header
    const head = new TextDecoder('latin1').decode(buf.slice(0, 200));
    const label = (head.match(/encoding\s*=\s*["']([^"']+)["']/i) || [])[1] || ((res.headers.get('content-type') || '').match(/charset=([^;]+)/i) || [])[1] || 'utf-8';
    let text;
    try {
      text = new TextDecoder(label.trim()).decode(buf);
    } catch {
      text = new TextDecoder('utf-8').decode(buf);
    }
    return text;
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error(`waktu habis (${TIMEOUT_MS / 1000} dtk)`);
    throw new Error(e && e.cause && e.cause.code ? `${e.message} (${e.cause.code})` : (e && e.message) || 'gagal mengunduh');
  } finally {
    clearTimeout(timer);
  }
}

async function pool(tasks, size) {
  const results = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }));
  return results;
}

/* ---------------- utama ---------------- */
async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function main() {
  const config = await readJson(SOURCES_FILE, null);
  if (!config || !Array.isArray(config.sources)) {
    console.error(`Gagal membaca daftar sumber: ${SOURCES_FILE}`);
    process.exit(1);
  }
  const sources = config.sources.filter((s) => s && s.enabled !== false && typeof s.url === 'string' && /^https?:\/\//i.test(s.url) && s.id && s.name);
  const now = Date.now();
  const previous = await readJson(OUT_FILE, { generatedAt: null, items: [] });
  const byId = new Map();
  for (const it of Array.isArray(previous.items) ? previous.items : []) {
    if (it && typeof it.id === 'string' && typeof it.url === 'string') byId.set(it.id, it);
  }

  const statuses = await pool(sources.map((src) => async () => {
    const status = { id: src.id, name: src.name, url: src.url, ok: false, total: 0, matched: 0, error: null };
    try {
      const xml = await fetchText(src.url);
      const entries = parseFeed(xml, src.url);
      status.ok = true;
      status.total = entries.length;
      for (const e of entries) {
        const topics = classify(`${e.title} ${e.summaryFull}`);
        if (topics.length === 0) continue;
        status.matched += 1;
        const key = canonical(e.url);
        const id = idOf(key);
        const old = byId.get(id);
        const publishedAt = new Date(e.ts !== null ? Math.min(e.ts, now) : (old ? Date.parse(old.publishedAt) || now : now)).toISOString();
        byId.set(id, {
          id, title: e.title, url: key, source: src.name, sourceId: src.id, publishedAt,
          summary: truncate(e.summary, SUMMARY_MAX), topics,
        });
      }
    } catch (err) {
      status.error = err.message;
    }
    console.log(`${status.ok ? 'OK   ' : 'GAGAL'} ${src.name.padEnd(16)} ${status.ok ? `${status.matched} relevan dari ${status.total}` : status.error}`);
    return status;
  }), CONCURRENCY);

  const okCount = statuses.filter((s) => s.ok).length;
  const cutoff = now - KEEP_DAYS * 86400000;
  const items = [...byId.values()]
    .filter((it) => Date.parse(it.publishedAt) >= cutoff)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, MAX_ITEMS);

  const result = {
    generatedAt: okCount > 0 ? new Date(now).toISOString() : (previous.generatedAt || null),
    checkedAt: new Date(now).toISOString(),
    sources: statuses,
    items,
  };
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  const tmp = `${OUT_FILE}.tmp`;
  await writeFile(tmp, `${JSON.stringify(result, null, 1)}\n`, 'utf8');
  await rename(tmp, OUT_FILE);
  console.log(`\n${okCount} dari ${statuses.length} sumber berhasil, ${items.length} berita tersimpan -> ${path.relative(process.cwd(), OUT_FILE)}`);
  if (okCount === 0 && statuses.length > 0) {
    console.warn('Semua sumber gagal. Berita lama dipertahankan.');
    if (STRICT) process.exit(1);
  }
}

main().catch((e) => {
  console.error('Terjadi kesalahan tak terduga:', e);
  process.exit(1);
});
