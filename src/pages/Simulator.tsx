import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from 'next-themes';
import { calculateScenario, formatNumber, formatRupiah } from '../lib/energy';
import { useEnergy } from '../lib/EnergyContext';

/* ------------------------------------------------------------------ */
/* Utilitas                                                            */
/* ------------------------------------------------------------------ */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

type Zone = 'demand' | 'efficiency' | 'cooling' | 'supply' | 'storage' | 'cost' | 'rebound';
type ZoneState = { id: Zone; text: string };

const ZONE_COLOR: Record<Zone, string> = {
  demand: '#e58b5b',
  efficiency: '#287f69',
  cooling: '#5798a2',
  supply: '#f2b94b',
  storage: '#7be0b8',
  cost: '#c4a232',
  rebound: '#5798a2',
};


/* Palet ilustrasi pusat data untuk mode terang dan gelap */
type ScenePalette = {
  ground: string; smoke: string; towerFill: string; blade: string; green: string; orange: string;
  panelFill: string; panelLine: string; battBg: string; bldFill: string; bldLine: string; heat: string;
  roofFill: string; roofLine: string; fanBg: string; fanBlade: string; rackFill: string;
  slotOff: string; slotOn: string; led: string; wave: string; label: string; strong: string;
  netLink: string; netNode: string; netStroke: string; hub: string;
  groundFill: string; gridLine: string; haloBg: string; shell: string;
};

const PAL_DARK: ScenePalette = {
  ground: '#24463e', smoke: '#9aa9a4', towerFill: '#cfe9e0', blade: '#e8f6f0', green: '#7be0b8', orange: '#e58b5b',
  panelFill: '#2f6f8a', panelLine: '#7fc3dc', battBg: '#0f2228', bldFill: '#12272d', bldLine: '#2f5a4f', heat: '#f19a6a',
  roofFill: '#1b3a42', roofLine: '#4d8fa0', fanBg: '#0f2228', fanBlade: '#8fd3e6', rackFill: '#1b332e',
  slotOff: '#213f38', slotOn: '#2a5a4e', led: '#7be0b8', wave: '#f19a6a', label: '#8db5a8', strong: '#cfe9e0',
  netLink: '#4f7f73', netNode: '#12272d', netStroke: '#c9d6d1', hub: '#e58b5b',
  groundFill: '#0c1916', gridLine: '#1c3a34', haloBg: '#0f1f1c', shell: '#4d8fa0',
};

const PAL_LIGHT: ScenePalette = {
  ground: '#c8c0aa', smoke: '#8a9893', towerFill: '#8fa59d', blade: '#5f7b72', green: '#1f9d73', orange: '#d9733f',
  panelFill: '#3b86a6', panelLine: '#1f5f7a', battBg: '#ffffff', bldFill: '#e7ebe2', bldLine: '#9db4a9', heat: '#f19a6a',
  roofFill: '#d3e2e5', roofLine: '#4f8fa0', fanBg: '#ffffff', fanBlade: '#2f7f97', rackFill: '#cfdad2',
  slotOff: '#b7c8be', slotOn: '#3b9b84', led: '#1f9d73', wave: '#e0713a', label: '#5b7068', strong: '#1d3a33',
  netLink: '#8da89d', netNode: '#ffffff', netStroke: '#4c675e', hub: '#d9733f',
  groundFill: '#ece6d4', gridLine: '#d6cfb9', haloBg: '#f7f3e8', shell: '#9fbcb6',
};

/* Simpul : pembangkit (P), gardu induk (H), dan beban/pelanggan (A–D). */
const NET = {
  P: { x: 39, y: 176 },
  H: { x: 62, y: 236 },
  A: { x: 20, y: 262 },
  B: { x: 30, y: 314 },
  C: { x: 90, y: 312 },
  D: { x: 96, y: 262 },
};
const NET_LINKS: Array<[keyof typeof NET, keyof typeof NET]> = [
  ['P', 'H'], ['A', 'P'], ['H', 'A'], ['H', 'B'], ['A', 'B'], ['H', 'C'], ['H', 'D'], ['C', 'D'],
];

/* ------------------------------------------------------------------ */
/* Gaya                                                                */
/* ------------------------------------------------------------------ */

const SIM_STYLES = `
.page { max-width: 100%; overflow-x: hidden; }
.page-head { flex-wrap: wrap; gap: 10px; }
.page h1, .page h2 { overflow-wrap: anywhere; }
.ws { display: grid; grid-template-columns: minmax(0, 1fr) minmax(380px, 46%); gap: 16px; align-items: start; }
.ws > *, .ws-controls, .ws-stage, .panel { min-width: 0; }
.ws-hint { font-size: .84rem; margin: 0 0 12px; opacity: .8; }
.ws-lower-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 14px; margin-top: 14px; }
.ws-lower-grid > * { min-width: 0; }
.zone-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 8px; vertical-align: baseline; }

.control-group input[type="range"] { width: 100%; max-width: 100%; }
.range-head { flex-wrap: wrap; gap: 4px 12px; }
.range-head label { min-width: 0; overflow-wrap: anywhere; }
.field-help { overflow-wrap: anywhere; }
.chart-area { width: 100%; min-width: 0; }
.chart-area .recharts-text, .chart-area .recharts-cartesian-axis-tick-value { fill: hsl(var(--muted-foreground)); }
.chart-area .recharts-cartesian-grid line { stroke: hsl(var(--border)); }
.chart-area .recharts-default-tooltip { background-color: hsl(var(--card)) !important; border-color: hsl(var(--border)) !important; color: hsl(var(--foreground)); }
.chart-area .recharts-tooltip-cursor { fill: hsl(var(--muted) / .5); }
.metrics-grid { grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); }
.metrics-grid > * { min-width: 0; overflow-wrap: anywhere; }

.scenario-table-wrap { overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch; border-radius: 8px; }
.scenario-table { min-width: 640px; width: 100%; }
.scenario-table th, .scenario-table td { white-space: nowrap; }

.dc-scene-card { --dc-bg: #f7f3e8; --dc-line: #ddd6c2; --dc-text: #17302a; --dc-muted: #5b7068; --dc-chip: #e9e4d3; --dc-border: #b9c9bf; --dc-accent: #1f9d73; --dc-accent-ink: #ffffff; }
.dark .dc-scene-card { --dc-bg: #0f1f1c; --dc-line: #1c3a34; --dc-text: #eaf7f1; --dc-muted: #8db5a8; --dc-chip: #17302b; --dc-border: #2f5a4f; --dc-accent: #7be0b8; --dc-accent-ink: #0b1a17; }
.dc-scene-card { background: var(--dc-bg); border: 1px solid hsl(var(--border)); border-radius: 14px; overflow: hidden; color: var(--dc-text); width: 100%; }
.dc-scene-top { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 14px 16px 4px; }
.dc-scene-top h2 { margin: 0; font-size: 1.02rem; color: var(--dc-text); }
.dc-scene-top p { margin: 2px 0 0; font-size: .78rem; color: var(--dc-muted); max-width: 44ch; }
.dc-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; max-width: 100%; }
.dc-anim { border: 1px solid var(--dc-border); background: transparent; color: var(--dc-muted); font: inherit; font-size: .78rem; padding: 6px 12px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
.dc-anim[aria-pressed="true"] { border-color: var(--dc-accent); color: var(--dc-accent); }
.dc-anim:focus-visible { outline: 2px solid var(--dc-accent); outline-offset: 2px; }
.dc-modes { display: inline-flex; background: var(--dc-chip); border-radius: 999px; padding: 3px; gap: 2px; max-width: 100%; }
.dc-modes button { border: 0; background: transparent; color: var(--dc-muted); font: inherit; font-size: .78rem; padding: 6px 11px; border-radius: 999px; cursor: pointer; transition: background .25s, color .25s; white-space: nowrap; }
.dc-modes button[aria-pressed="true"] { background: var(--dc-accent); color: var(--dc-accent-ink); font-weight: 600; }
.dc-modes button:focus-visible { outline: 2px solid var(--dc-accent); outline-offset: 2px; }
.dc-svg { display: block; width: 100%; height: auto; }
.dc-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--dc-line); border-top: 1px solid var(--dc-line); }
.dc-stat { background: var(--dc-bg); padding: 10px 14px; min-width: 0; }
.dc-stat-label { font-size: .7rem; color: var(--dc-muted); }
.dc-stat-value { font-size: 1.15rem; font-weight: 650; color: var(--dc-text); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.dc-stat-unit { font-size: .7rem; color: var(--dc-muted); margin-left: 4px; font-weight: 400; }
.dc-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; padding: 9px 16px; font-size: .72rem; color: var(--dc-muted); }
.dc-legend i { display: inline-block; width: 12px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: baseline; }
.dc-goal { padding: 12px 16px 14px; border-top: 1px solid var(--dc-line); }
.dc-goal-top { display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: space-between; font-size: .75rem; color: var(--dc-muted); }
.dc-goal h3 { margin: 4px 0 6px; font-size: .95rem; color: var(--dc-text); }
.dc-goal p { margin: 6px 0 0; font-size: .76rem; color: var(--dc-muted); line-height: 1.45; }
.dc-goal-track { height: 8px; border-radius: 4px; background: var(--dc-line); overflow: hidden; }
.dc-goal-fill { height: 100%; border-radius: 4px; background: #e58b5b; }
.dc-goal-ok .dc-goal-fill { background: var(--dc-accent); }
.dc-goal-ok h3 { color: var(--dc-accent); }

.sol-head { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.sol-head > div:first-child { min-width: 0; flex: 1 1 260px; }
.sol-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.sol-btn { font: inherit; font-size: .82rem; padding: 8px 14px; min-height: 40px; border-radius: 8px; border: 1px solid hsl(var(--border)); background: transparent; color: inherit; cursor: pointer; transition: background .2s, border-color .2s; }
.sol-btn:hover { border-color: #287f69; }
.sol-btn:focus-visible { outline: 2px solid #287f69; outline-offset: 2px; }
.sol-btn-primary { background: #287f69; border-color: #287f69; color: #fff; }
.sol-btn-primary:hover { background: #226b59; }
.sol-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr)); gap: 14px; }
.sol-card { border: 1px solid hsl(var(--border)); border-left: 4px solid var(--accent); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; transition: background .3s; }
.sol-card[data-applied="true"] { background: color-mix(in srgb, var(--accent) 9%, transparent); }
.sol-card h3 { margin: 0; font-size: 1rem; overflow-wrap: anywhere; }
.sol-card p { margin: 0; font-size: .86rem; line-height: 1.5; }
.sol-meter { display: grid; gap: 6px; }
.sol-meter-row { display: grid; grid-template-columns: 52px minmax(0, 1fr) 56px; align-items: center; gap: 8px; font-size: .76rem; }
.sol-track { height: 7px; border-radius: 4px; background: hsl(var(--border)); overflow: hidden; }
.sol-fill { height: 100%; border-radius: 4px; background: var(--accent); transition: width .7s cubic-bezier(.2,.8,.2,1); }
.sol-num { text-align: right; font-variant-numeric: tabular-nums; }
.sol-card .sol-btn { align-self: flex-start; margin-top: auto; }
.sol-badge { font-size: .74rem; color: var(--accent); font-weight: 600; }

.sol-btn:disabled { opacity: .5; cursor: not-allowed; }
.log-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.log-input { flex: 1 1 220px; min-width: 0; font: inherit; font-size: .86rem; padding: 9px 12px; min-height: 40px; border-radius: 8px; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); color: hsl(var(--foreground)); }
.log-input:focus-visible { outline: 2px solid #287f69; outline-offset: 2px; }
.log-status { font-size: .78rem; color: hsl(var(--primary)); min-height: 1.3em; margin: 0 0 8px; }
.log-empty { padding: 18px; border: 1px dashed hsl(var(--border)); border-radius: 10px; font-size: .86rem; text-align: center; color: hsl(var(--muted-foreground)); line-height: 1.55; }
/* Catatan percobaan */
.log-note-wrap { position: relative; margin-bottom: 10px; }
.log-textarea { display: block; width: 100%; flex: none; resize: vertical; min-height: 66px; line-height: 1.5; padding-bottom: 24px; }
.log-count { position: absolute; right: 12px; bottom: 8px; font-size: .7rem; color: hsl(var(--muted-foreground)); pointer-events: none; }
.log-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.log-chart-head { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; justify-content: space-between; margin-top: 18px; }
.log-tabs { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 3px; border: 1px solid hsl(var(--border)); border-radius: 999px; background: hsl(var(--secondary) / .6); }
.log-tabs button { border: 0; background: transparent; color: hsl(var(--muted-foreground)); font: inherit; font-size: .78rem; padding: 6px 12px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
.log-tabs button[aria-pressed="true"] { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-weight: 600; }
.log-tabs button:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.log-chart { height: 280px; }
.log-compare { margin-bottom: 6px; }
.log-delta { font-size: .82rem; font-weight: 650; margin-top: 4px; }
.log-good { color: hsl(var(--primary)); }
.log-bad { color: hsl(var(--destructive)); }
.log-tip { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 8px 10px; font-size: .78rem; max-width: 240px; color: hsl(var(--foreground)); box-shadow: 0 6px 20px rgba(0,0,0,.14); }
.log-tip-time { color: hsl(var(--muted-foreground)); font-size: .72rem; margin-top: 2px; }
.log-tip-note { margin-top: 6px; line-height: 1.4; overflow-wrap: anywhere; }
.log-table { min-width: 1000px; }
.log-table td { white-space: nowrap; vertical-align: top; }
.log-table td.log-note { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; min-width: 240px; max-width: 380px; text-align: left; font-family: inherit; }
.log-table th.log-note { text-align: left; }
.dl-menu { position: relative; }
.dl-list { position: absolute; left: 0; top: calc(100% + 6px); z-index: 40; width: max-content; min-width: 270px; max-width: min(340px, 86vw); background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 10px; padding: 6px; box-shadow: 0 12px 32px rgba(0,0,0,.2); }
.dl-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; text-align: left; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: inherit; font: inherit; font-size: .84rem; cursor: pointer; }
.dl-item small { font-size: .72rem; color: hsl(var(--muted-foreground)); }
.dl-item:hover, .dl-item:focus-visible { background: hsl(var(--secondary)); outline: none; }

/* Tampilan 3D */
.dc-canvas-wrap { width: 100%; }
.dc-canvas { display: block; width: 100%; height: auto; aspect-ratio: 760 / 410; cursor: grab; touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; outline: none; }
.dc-canvas:active { cursor: grabbing; }
.dc-canvas:focus-visible { outline: 2px solid var(--dc-accent); outline-offset: -2px; }
.dc-3d-bar { padding: 4px 14px 10px; }
.dc-3d-btns { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.dc-3d-btns .dc-anim { width: auto; padding: 6px 11px; }
.dc-3d-btns .dc-zoom-btn { min-width: 38px; font-size: 1rem; line-height: 1; padding: 5px 10px; }
.dc-zoom { min-width: 46px; text-align: center; font-size: .76rem; color: var(--dc-muted); font-variant-numeric: tabular-nums; }
.dc-3d-hint { margin: 8px 0 0; font-size: .72rem; color: var(--dc-muted); line-height: 1.5; }
.log-del { min-height: 32px; padding: 4px 10px; font-size: .76rem; }
.dc-log-row { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin-top: 12px; }
.dc-log-row .dc-anim { width: auto; }
.dc-log-row span { font-size: .74rem; color: var(--dc-muted); }
.dc-log-row a { color: inherit; text-decoration: underline; }

@media (max-width: 1000px) {
  .ws { grid-template-columns: minmax(0, 1fr); }
  .ws-stage { order: -1; }
}
@media (max-width: 640px) {
  .dc-3d-bar { padding: 4px 12px 10px; }
  .dc-3d-btns .dc-anim { min-height: 40px; }
  .log-chart { height: 240px; }
  .dc-scene-top { padding: 12px 12px 4px; }
  .dc-scene-top p { display: none; }
  .dc-controls { width: 100%; }
  .dc-anim { width: 100%; padding: 8px 12px; }
  .dc-modes { width: 100%; }
  .dc-modes button { flex: 1 1 0; padding: 8px 4px; font-size: .74rem; }
  .dc-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dc-stat { padding: 9px 12px; }
  .dc-legend { padding: 8px 12px; }
  .dc-goal { padding: 10px 12px 12px; }
  .sol-actions { width: 100%; }
  .sol-actions .sol-btn { flex: 1 1 140px; }
  .sol-card .sol-btn { align-self: stretch; }
  .sol-meter-row { grid-template-columns: 46px minmax(0, 1fr) 52px; }
}
@media (prefers-reduced-motion: reduce) {
  .sol-fill, .dc-modes button { transition: none; }
}
`;


/* ------------------------------------------------------------------ */
/* Catatan percobaan: penyimpanan, perbandingan, CSV, dan PDF          */
/* ------------------------------------------------------------------ */

type Experiment = {
  id: string;
  time: string; // ISO
  note: string;
  // data dasar dari Kalkulator
  baseItMw: number; basePue: number; tariff: number; carbon: number;
  // pengaturan slider
  workloadGrowth: number; modelReduction: number; softwareReduction: number; optimizationOverlap: number;
  reboundEffect: number; optimizedPue: number; cleanShare: number; solarMix: number;
  temporalMatch: number; storageEfficiency: number; renewablePriceRatio: number;
  // hasil (skenario Gabungan)
  optimizedItMw: number; currentTwh: number; demandTwh: number; combinedTwh: number;
  energyReduction: number; costTrillion: number; emissionsKt: number; emissionsReduction: number;
  success: boolean;
};

const LOG_KEY = 'ai-energy-lab-percobaan';
const MAX_LOG = 200;
const NOTE_MAX = 300;
const CHART_MAX = 20; // jumlah percobaan terakhir yang digambar di grafik

function loadLog(): Experiment[] {
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data)
      ? data.filter((e): e is Experiment => !!e && typeof e === 'object' && typeof e.id === 'string' && typeof e.time === 'string')
      : [];
  } catch {
    return [];
  }
}

function saveLog(list: Experiment[]) {
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(list));
  } catch {
    /* penyimpanan penuh atau diblokir: catatan tetap ada selama halaman terbuka */
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

/* ---------- metrik untuk grafik dan perbandingan ---------- */

type LogMetric = 'energy' | 'emissions' | 'cost' | 'saving';
type MetricDef = {
  id: LogMetric; label: string; unit: string; color: string; digits: number;
  lowerIsBetter: boolean; get: (e: Experiment) => number;
};
const LOG_METRICS: MetricDef[] = [
  { id: 'energy', label: 'Listrik', unit: 'TWh', color: '#287f69', digits: 3, lowerIsBetter: true, get: (e) => e.combinedTwh },
  { id: 'emissions', label: 'Emisi', unit: 'kt CO₂e', color: '#5798a2', digits: 1, lowerIsBetter: true, get: (e) => e.emissionsKt },
  { id: 'cost', label: 'Biaya', unit: 'Rp triliun', color: '#e58b5b', digits: 3, lowerIsBetter: true, get: (e) => e.costTrillion },
  { id: 'saving', label: 'Hemat listrik', unit: '%', color: '#c4a232', digits: 1, lowerIsBetter: false, get: (e) => e.energyReduction },
];

const pctChange = (now: number, before: number): number | null =>
  Number.isFinite(before) && before !== 0 ? ((now - before) / Math.abs(before)) * 100 : null;

const signedNumber = (n: number, digits: number) => {
  const text = formatNumber(Math.abs(n), digits);
  if (Number(Math.abs(n).toFixed(digits)) === 0) return text;
  return n > 0 ? `+${text}` : `−${text}`;
};

function changeSentence(def: MetricDef, last: Experiment, prev: Experiment): string {
  const d = def.get(last) - def.get(prev);
  const p = pctChange(def.get(last), def.get(prev));
  const rounded = Number(Math.abs(d).toFixed(def.digits));
  const verb = rounded === 0 ? 'tetap' : d > 0 ? 'naik' : 'turun';
  const name = def.id === 'saving' ? 'Penghematan listrik' : def.label;
  const unit = def.id === 'saving' ? 'poin persentase' : def.unit;
  const amount = rounded === 0 ? '' : ` ${formatNumber(Math.abs(d), def.digits)} ${unit}`;
  const pct = p !== null && def.id !== 'saving' && rounded !== 0 ? ` (${signedNumber(p, 1)}%)` : '';
  return `${name} ${verb}${amount}${pct}.`;
}

/* ---------- CSV ---------- */

type CsvFlavor = 'id' | 'intl';
type Cell = string | boolean | [number, number]; // [nilai, jumlah desimal]

function csvCell(cell: Cell, flavor: CsvFlavor): string {
  if (Array.isArray(cell)) {
    const [value, digits] = cell;
    if (!Number.isFinite(value)) return '';
    const text = value.toFixed(digits);
    return flavor === 'id' ? text.replace('.', ',') : text;
  }
  if (typeof cell === 'boolean') return cell ? 'ya' : 'tidak';
  // Catatan satu baris saja agar baris CSV tidak terpecah; netralkan awalan rumus agar aman di Excel.
  let text = cell.replace(/\s+/g, ' ').trim();
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  const delimiter = flavor === 'id' ? ';' : ',';
  return text.includes(delimiter) || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_HEADER = [
  'No', 'Waktu', 'Catatan',
  'Beban IT dasar (MW)', 'PUE dasar', 'Tarif (Rp/kWh)', 'Faktor karbon (kg CO2e/kWh)',
  'Pertumbuhan penggunaan AI (%)', 'Hemat dari model lebih ringan (%)', 'Hemat dari komputer dan program (%)',
  'Penghematan tumpang tindih (%)', 'Rebound (%)', 'PUE baru',
  'Porsi terbarukan (%)', 'Porsi surya dari terbarukan (%)', 'Kecocokan waktu (%)', 'Efisiensi baterai (%)', 'Harga terbarukan (% tarif)',
  'Beban IT hasil (MW)', 'Listrik saat ini (TWh)', 'Listrik tanpa tindakan (TWh)', 'Listrik skenario gabungan (TWh)',
  'Penurunan listrik vs tanpa tindakan (%)', 'Biaya energi gabungan (Rp triliun)',
  'Emisi gabungan (kt CO2e)', 'Penurunan emisi vs tanpa tindakan (%)', 'Target -30% tercapai',
  'Perubahan listrik vs percobaan sebelumnya (%)',
];

function experimentRow(e: Experiment, no: number, prev: Experiment | undefined): Cell[] {
  const change = prev ? pctChange(e.combinedTwh, prev.combinedTwh) : null;
  return [
    [no, 0], formatTime(e.time), e.note,
    [e.baseItMw, 2], [e.basePue, 2], [e.tariff, 0], [e.carbon, 3],
    [e.workloadGrowth, 1], [e.modelReduction, 1], [e.softwareReduction, 1],
    [e.optimizationOverlap, 1], [e.reboundEffect, 1], [e.optimizedPue, 2],
    [e.cleanShare, 1], [e.solarMix, 1], [e.temporalMatch, 1], [e.storageEfficiency, 1], [e.renewablePriceRatio, 1],
    [e.optimizedItMw, 3], [e.currentTwh, 4], [e.demandTwh, 4], [e.combinedTwh, 4],
    [e.energyReduction, 2], [e.costTrillion, 4],
    [e.emissionsKt, 3], [e.emissionsReduction, 2], e.success,
    change === null ? '' : [change, 2],
  ];
}

function buildCsv(list: Experiment[], flavor: CsvFlavor): string {
  const delimiter = flavor === 'id' ? ';' : ',';
  const lines = [CSV_HEADER.map((h) => csvCell(h, flavor)).join(delimiter)];
  list.forEach((e, i) => {
    lines.push(experimentRow(e, i + 1, list[i - 1]).map((cell) => csvCell(cell, flavor)).join(delimiter));
  });
  // BOM di depan agar Excel membaca UTF-8 dengan benar.
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const fileStamp = (d: Date) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;

/* ---------- PDF (ditulis langsung, tanpa pustaka) ---------- */

// Lebar huruf Helvetica (per 1000 satuan) untuk kode 32..126, dipakai untuk membungkus teks.
const HELV_W = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const PDF_MAP: Record<string, string> = {
  '₂': '2', '–': '-', '—': '-', '−': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...',
  '→': '->', '≥': '>=', '≤': '<=', '＋': '+', '▲': '+', '▼': '-', '\u00a0': ' ', '\n': ' ', '\r': ' ', '\t': ' ',
};
function pdfText(s: string): string {
  let out = '';
  for (const ch of s) {
    const mapped = PDF_MAP[ch];
    if (mapped !== undefined) out += mapped;
    else {
      const code = ch.charCodeAt(0);
      out += (code >= 32 && code <= 126) || (code >= 160 && code <= 255) ? ch : '?';
    }
  }
  return out;
}
const pdfEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
function pdfWidth(s: string, size: number, bold = false): number {
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i);
    total += code >= 32 && code <= 126 ? HELV_W[code - 32] : 556;
  }
  return (total / 1000) * size * (bold ? 1.07 : 1);
}
function wrapText(raw: string, maxW: number, size: number, bold = false): string[] {
  const text = pdfText(raw).replace(/\s+/g, ' ').trim();
  if (!text) return [''];
  const lines: string[] = [];
  let line = '';
  const flush = () => {
    if (line) lines.push(line);
    line = '';
  };
  text.split(' ').forEach((word) => {
    let w = word;
    // kata yang lebih lebar dari kolom dipotong per huruf
    while (pdfWidth(w, size, bold) > maxW) {
      flush();
      let cut = 1;
      while (cut < w.length && pdfWidth(w.slice(0, cut + 1), size, bold) <= maxW) cut += 1;
      lines.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const trial = line ? `${line} ${w}` : w;
    if (pdfWidth(trial, size, bold) <= maxW) line = trial;
    else {
      flush();
      line = w;
    }
  });
  flush();
  return lines;
}
const mixHex = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
};

class PdfDoc {
  readonly W = 842;
  readonly H = 595;
  readonly M = 36;
  pages: string[][] = [[]];
  get ops(): string[] {
    return this.pages[this.pages.length - 1];
  }
  addPage() {
    this.pages.push([]);
  }
  private col(hex: string) {
    const [r, g, b] = hexRgb(hex);
    return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
  }
  fillRect(x: number, y: number, w: number, h: number, hex: string, page?: string[]) {
    (page ?? this.ops).push(`${this.col(hex)} rg ${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  line(x1: number, y1: number, x2: number, y2: number, hex: string, width = 0.5) {
    this.ops.push(`${this.col(hex)} RG ${width} w ${x1.toFixed(2)} ${(this.H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - y2).toFixed(2)} l S`);
  }
  text(str: string, x: number, y: number, size: number, hex = '#1f2a27', bold = false, align: 'left' | 'right' | 'center' = 'left', page?: string[]) {
    const t = pdfText(str);
    const wd = pdfWidth(t, size, bold);
    const px = align === 'left' ? x : align === 'right' ? x - wd : x - wd / 2;
    (page ?? this.ops).push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${this.col(hex)} rg ${px.toFixed(2)} ${(this.H - y).toFixed(2)} Td (${pdfEsc(t)}) Tj ET`);
  }
}

type PdfCol = { head: string; w: number; align?: 'left' | 'right' | 'center' };

function pdfTable(doc: PdfDoc, startY: number, cols: PdfCol[], rows: string[][]): number {
  const FS = 8;
  const HS = 7.5;
  const LH = 10;
  const PAD = 3.5;
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const cellX = (c: PdfCol, x: number) => (c.align === 'right' ? x + c.w - PAD : c.align === 'center' ? x + c.w / 2 : x + PAD);
  const drawHead = (yy: number): number => {
    const wrapped = cols.map((c) => wrapText(c.head, c.w - 2 * PAD, HS, true));
    const hh = Math.max(...wrapped.map((l) => l.length)) * 9.5 + PAD * 2;
    doc.fillRect(doc.M, yy, tableW, hh, '#dcebe4');
    let x = doc.M;
    cols.forEach((c, i) => {
      wrapped[i].forEach((ln, k) => doc.text(ln, cellX(c, x), yy + PAD + HS + k * 9.5 - 0.5, HS, '#17302a', true, c.align ?? 'left'));
      x += c.w;
    });
    return yy + hh;
  };
  let y = drawHead(startY);
  rows.forEach((row, ri) => {
    const wrapped = cols.map((c, i) => wrapText(row[i] ?? '', c.w - 2 * PAD, FS));
    const rh = Math.max(...wrapped.map((l) => l.length)) * LH + PAD * 2;
    if (y + rh > doc.H - 46) {
      doc.addPage();
      y = drawHead(doc.M);
    }
    if (ri % 2 === 1) doc.fillRect(doc.M, y, tableW, rh, '#f4f7f5');
    let x = doc.M;
    cols.forEach((c, i) => {
      wrapped[i].forEach((ln, k) => doc.text(ln, cellX(c, x), y + PAD + FS + k * LH - 1, FS, '#1f2a27', false, c.align ?? 'left'));
      x += c.w;
    });
    doc.line(doc.M, y + rh, doc.M + tableW, y + rh, '#d5ddd9', 0.4);
    y += rh;
  });
  return y;
}

function pdfBarChart(
  doc: PdfDoc, x: number, y: number, w: number, h: number,
  title: string, items: Array<{ label: string; value: number }>, color: string, digits: number,
) {
  doc.fillRect(x, y, w, h, '#fbfcfb');
  doc.line(x, y, x + w, y, '#cfd8d3', 0.6);
  doc.line(x, y + h, x + w, y + h, '#cfd8d3', 0.6);
  doc.text(title, x + 6, y + 13, 9, '#17302a', true);
  const left = x + 44;
  const top = y + 24;
  const pw = w - 54;
  const ph = h - 24 - 18;
  const vals = items.map((i) => i.value);
  const maxV = Math.max(0, ...vals) * 1.12;
  const minV = Math.min(0, ...vals) * 1.12;
  const range = maxV - minV || 1;
  const yOf = (v: number) => top + ph - ((v - minV) / range) * ph;
  for (let g = 0; g <= 4; g += 1) {
    const v = minV + (range * g) / 4;
    const gy = yOf(v);
    doc.line(left, gy, left + pw, gy, '#e3e9e5', 0.4);
    doc.text(formatNumber(v, digits), left - 4, gy + 2.3, 6.5, '#6b7a74', false, 'right');
  }
  const n = items.length;
  const slot = pw / Math.max(1, n);
  const bw = Math.min(slot * 0.62, 28);
  const zero = yOf(0);
  items.forEach((it, i) => {
    const bx = left + slot * i + (slot - bw) / 2;
    const top0 = yOf(Math.max(it.value, 0));
    const bot0 = zero;
    const isLast = i === n - 1;
    const isPrev = i === n - 2;
    const fill = isLast ? color : mixHex(color, '#ffffff', isPrev ? 0.35 : 0.62);
    doc.fillRect(bx, Math.min(top0, yOf(it.value)), bw, Math.max(0.6, Math.abs(yOf(it.value) - bot0)), fill);
    doc.text(it.label, bx + bw / 2, top + ph + 10, 6.5, '#4a5a54', false, 'center');
    if (isLast || isPrev || n <= 8) {
      doc.text(formatNumber(it.value, digits), bx + bw / 2, Math.min(top0, yOf(it.value)) - 2.5, 6.8, '#17302a', true, 'center');
    }
  });
}

function assemblePdf(pages: string[][], W: number, H: number, title: string, when: Date): Uint8Array {
  const total = 5 + pages.length * 2;
  const parts: string[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (s: string) => {
    parts.push(s);
    pos += s.length;
  };
  const obj = (id: number, body: string) => {
    offsets[id] = pos;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  };
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, i) => `${6 + i * 2} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const stamp = `D:${when.getFullYear()}${pad2(when.getMonth() + 1)}${pad2(when.getDate())}${pad2(when.getHours())}${pad2(when.getMinutes())}${pad2(when.getSeconds())}`;
  obj(5, `<< /Title (${pdfEsc(pdfText(title))}) /Producer (AI Energy Lab) /CreationDate (${stamp}) >>`);
  pages.forEach((ops, i) => {
    const content = ops.join('\n');
    obj(6 + i * 2, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + i * 2} 0 R >>`);
    obj(7 + i * 2, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const xrefPos = pos;
  let xref = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= total; id += 1) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(`${xref}trailer\n<< /Size ${total + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);
  const all = parts.join('');
  const bytes = new Uint8Array(all.length);
  for (let i = 0; i < all.length; i += 1) bytes[i] = all.charCodeAt(i) & 255;
  return bytes;
}

function buildPdf(list: Experiment[], when: Date): Uint8Array {
  const doc = new PdfDoc();
  const { M, W } = doc;
  const innerW = W - 2 * M;
  const n = list.length;

  /* ---- halaman 1: ringkasan dan grafik perbandingan ---- */
  doc.text('Laporan catatan percobaan', M, M + 16, 19, '#17302a', true);
  doc.text(`AI Energy Lab - Simulator solusi energi AI  |  dibuat ${formatTime(when.toISOString())}`, M, M + 31, 8.5, '#6b7a74');

  const minBy = (get: (e: Experiment) => number) => {
    let best = 0;
    list.forEach((e, i) => {
      if (get(e) < get(list[best])) best = i;
    });
    return best;
  };
  const bestEnergy = minBy((e) => e.combinedTwh);
  const bestEmission = minBy((e) => e.emissionsKt);
  const okCount = list.filter((e) => e.success).length;
  const boxes: Array<[string, string, string]> = [
    ['Jumlah percobaan', String(n), 'tercatat'],
    ['Listrik terendah', `${formatNumber(list[bestEnergy].combinedTwh, 3)} TWh`, `percobaan #${bestEnergy + 1}`],
    ['Emisi terendah', `${formatNumber(list[bestEmission].emissionsKt, 1)} kt CO2e`, `percobaan #${bestEmission + 1}`],
    ['Target hemat 30% tercapai', `${okCount} dari ${n}`, 'percobaan'],
  ];
  const bw = (innerW - 30) / 4;
  boxes.forEach(([label, value, sub], i) => {
    const bx = M + i * (bw + 10);
    doc.fillRect(bx, 76, bw, 44, '#eef5f1');
    doc.text(label, bx + 8, 89, 7.5, '#5b7068');
    doc.text(value, bx + 8, 105, 13, '#17302a', true);
    doc.text(sub, bx + 8, 115, 7, '#6b7a74');
  });

  doc.text('Perbandingan dengan percobaan sebelumnya', M, 138, 10, '#17302a', true);
  if (n >= 2) {
    doc.text(`Percobaan terbaru (#${n}) dibanding sebelumnya (#${n - 1}):`, M, 150, 8.5, '#4a5a54');
    LOG_METRICS.forEach((m, i) => {
      doc.text(`-  ${changeSentence(m, list[n - 1], list[n - 2])}`, M + 8, 162 + i * 11, 8.5);
    });
  } else {
    doc.text('Belum ada pembanding. Catat minimal 2 percobaan untuk melihat perubahan.', M, 150, 8.5, '#4a5a54');
  }

  const recent = list.slice(-CHART_MAX).map((e) => ({ e, no: list.indexOf(e) + 1 }));
  const chartW = (innerW - 10) / 2;
  const chartH = 140;
  const cy0 = 214;
  LOG_METRICS.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    pdfBarChart(
      doc, M + col * (chartW + 10), cy0 + row * (chartH + 8), chartW, chartH,
      `${m.label} (${m.unit})`,
      recent.map(({ e, no }) => ({ label: `#${no}`, value: m.get(e) })),
      m.color, m.digits,
    );
  });
  if (n > CHART_MAX) doc.text(`Grafik menampilkan ${CHART_MAX} percobaan terakhir dari ${n}.`, M, cy0 + 2 * chartH + 20, 7.5, '#6b7a74');
  else doc.text('Batang paling tua pekat = percobaan terbaru, batang lebih pudar = percobaan sebelumnya.', M, cy0 + 2 * chartH + 20, 7.5, '#6b7a74');

  /* ---- halaman berikutnya: tabel ---- */
  doc.addPage();
  doc.text('Daftar percobaan', M, M + 12, 12, '#17302a', true);
  const mainCols: PdfCol[] = [
    { head: 'No', w: 24, align: 'center' },
    { head: 'Waktu', w: 82 },
    { head: 'Catatan', w: 206 },
    { head: 'AI naik', w: 44, align: 'right' },
    { head: 'PUE baru', w: 44, align: 'right' },
    { head: 'Terbarukan', w: 58, align: 'right' },
    { head: 'Listrik (TWh)', w: 62, align: 'right' },
    { head: 'Emisi (kt CO2e)', w: 66, align: 'right' },
    { head: 'Hemat listrik', w: 52, align: 'right' },
    { head: 'Target hemat 30%', w: 52, align: 'center' },
    { head: 'Listrik vs sebelumnya', w: 80, align: 'right' },
  ];
  const mainRows = list.map((e, i) => {
    const pc = i > 0 ? pctChange(e.combinedTwh, list[i - 1].combinedTwh) : null;
    return [
      String(i + 1), formatTime(e.time), e.note || '-',
      `${formatNumber(e.workloadGrowth, 0)}%`, formatNumber(e.optimizedPue, 2), `${formatNumber(e.cleanShare, 0)}%`,
      formatNumber(e.combinedTwh, 3), formatNumber(e.emissionsKt, 1), `${formatNumber(e.energyReduction, 1)}%`,
      e.success ? 'Tercapai' : 'Belum', pc === null ? '-' : `${signedNumber(pc, 1)}%`,
    ];
  });
  const endY = pdfTable(doc, M + 22, mainCols, mainRows);

  const detailCols: PdfCol[] = [
    { head: 'No', w: 24, align: 'center' },
    { head: 'Beban IT dasar (MW)', w: 56, align: 'right' },
    { head: 'PUE dasar', w: 42, align: 'right' },
    { head: 'Tarif (Rp/kWh)', w: 52, align: 'right' },
    { head: 'Faktor karbon', w: 52, align: 'right' },
    { head: 'Hemat model', w: 52, align: 'right' },
    { head: 'Hemat komputer & program', w: 66, align: 'right' },
    { head: 'Tumpang tindih', w: 56, align: 'right' },
    { head: 'Rebound', w: 46, align: 'right' },
    { head: 'Surya', w: 40, align: 'right' },
    { head: 'Kecocokan waktu', w: 54, align: 'right' },
    { head: 'Baterai', w: 44, align: 'right' },
    { head: 'Harga terbarukan', w: 52, align: 'right' },
    { head: 'Biaya (Rp T)', w: 50, align: 'right' },
    { head: 'Tanpa tindakan (TWh)', w: 84, align: 'right' },
  ];
  const detailRows = list.map((e, i) => [
    String(i + 1), formatNumber(e.baseItMw, 2), formatNumber(e.basePue, 2), formatNumber(e.tariff, 0), formatNumber(e.carbon, 3),
    `${formatNumber(e.modelReduction, 0)}%`, `${formatNumber(e.softwareReduction, 0)}%`, `${formatNumber(e.optimizationOverlap, 0)}%`,
    `${formatNumber(e.reboundEffect, 0)}%`, `${formatNumber(e.solarMix, 0)}%`, `${formatNumber(e.temporalMatch, 0)}%`,
    `${formatNumber(e.storageEfficiency, 0)}%`, `${formatNumber(e.renewablePriceRatio, 0)}%`,
    formatNumber(e.costTrillion, 3), formatNumber(e.demandTwh, 3),
  ]);
  let dy = endY + 22;
  if (dy > doc.H - 120) {
    doc.addPage();
    dy = M + 12;
  }
  doc.text('Detail pengaturan tiap percobaan', M, dy, 12, '#17302a', true);
  const endDetail = pdfTable(doc, dy + 10, detailCols, detailRows);
  const note = 'Hasil yang dicatat adalah skenario Gabungan (efisiensi dan energi terbarukan) dibanding proyeksi tanpa tindakan. Ini simulasi sensitivitas untuk edukasi, bukan prediksi atau audit energi.';
  const noteLines = wrapText(note, innerW, 7.5);
  let ny = endDetail + 16;
  if (ny + noteLines.length * 9.5 > doc.H - 40) {
    doc.addPage();
    ny = M + 12;
  }
  noteLines.forEach((ln, i) => doc.text(ln, M, ny + i * 9.5, 7.5, '#6b7a74'));

  // nomor halaman di setiap halaman
  const totalPages = doc.pages.length;
  doc.pages.forEach((ops, i) => {
    doc.text('AI Energy Lab - Catatan percobaan', M, doc.H - 20, 7.5, '#8a9893', false, 'left', ops);
    doc.text(`Halaman ${i + 1} dari ${totalPages}`, W - M, doc.H - 20, 7.5, '#8a9893', false, 'right', ops);
  });
  return assemblePdf(doc.pages, doc.W, doc.H, 'Laporan catatan percobaan - AI Energy Lab', when);
}

/* ------------------------------------------------------------------ */
/* Komponen kontrol dan grafik                                         */
/* ------------------------------------------------------------------ */

type RangeControlProps = {
  label: string;
  shortLabel: string;
  zone: Zone;
  onTouch: (zone: Zone, text: string) => void;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  id: string;
  description: string;
  onChange: (value: number) => void;
};

function RangeControl({
  label,
  shortLabel,
  zone,
  onTouch,
  value,
  min,
  max,
  step,
  suffix,
  id,
  description,
  onChange,
}: RangeControlProps) {
  const decimals = step < 1 ? 2 : 0;

  return (
    <div className="control-group">
      <div className="range-head">
        <label htmlFor={id}>
          <span className="zone-dot" style={{ background: ZONE_COLOR[zone] }} aria-hidden="true" />
          {label}
        </label>
        <span className="range-value">
          {formatNumber(value, decimals)}{suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={`slider-${id}`}
        onChange={(event: { target: { value: string } }) => {
          const next = Number(event.target.value);
          onChange(next);
          onTouch(zone, `${shortLabel} ${formatNumber(next, decimals)}${suffix}`);
        }}
      />
      <div className="range-ends">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
      <div className="field-help">{description}</div>
    </div>
  );
}

function MiniChart({
  title,
  dataKey,
  unit,
  data,
  color,
}: {
  title: string;
  dataKey: string;
  unit: string;
  data: Array<Record<string, string | number>>;
  color: string;
}) {
  return (
    <div className="chart-area" role="img" aria-label={`Grafik perbandingan ${title}`}>
      <div className="metric-label">{title} · {unit}</div>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 3 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip formatter={(value: number) => `${formatNumber(value, 2)} ${unit}`} />
          <Bar dataKey={dataKey} name={title} fill={color} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Komponen catatan: menu unduh, grafik perbandingan, kartu perubahan   */
/* ------------------------------------------------------------------ */

function DownloadMenu({
  disabled,
  onCsvId,
  onCsvIntl,
  onPdf,
}: {
  disabled: boolean;
  onCsvId: () => void;
  onCsvIntl: () => void;
  onPdf: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        wrapRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    items.current[0]?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const choose = (run: () => void) => {
    setOpen(false);
    run();
  };
  const move = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const list = items.current.filter((b): b is HTMLButtonElement => !!b);
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
    list[next]?.focus();
  };

  const options: Array<{ label: string; hint: string; run: () => void; testId: string }> = [
    { label: 'CSV untuk Excel (Indonesia)', hint: 'Pemisah titik koma, angka memakai koma', run: onCsvId, testId: 'download-csv-id' },
    { label: 'CSV untuk Google Sheets / internasional', hint: 'Pemisah koma, angka memakai titik', run: onCsvIntl, testId: 'download-csv-intl' },
    { label: 'PDF laporan', hint: 'Ringkasan, grafik perbandingan, dan tabel lengkap', run: onPdf, testId: 'download-pdf' },
  ];

  return (
    <div className="dl-menu" ref={wrapRef}>
      <button
        type="button"
        className="sol-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        data-testid="button-log-download"
      >
        Unduh ▾
      </button>
      {open && (
        <div className="dl-list" role="menu" aria-label="Pilih format unduhan" onKeyDown={move}>
          {options.map((opt, i) => (
            <button
              key={opt.testId}
              type="button"
              role="menuitem"
              className="dl-item"
              ref={(el) => { items.current[i] = el; }}
              onClick={() => choose(opt.run)}
              data-testid={opt.testId}
            >
              <strong>{opt.label}</strong>
              <small>{opt.hint}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type LogPoint = { name: string; value: number; note: string; time: string; no: number; rank: 0 | 1 | 2 };

function LogTip({ active, payload, metric }: { active?: boolean; payload?: Array<{ payload: LogPoint }>; metric: MetricDef }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="log-tip">
      <strong>Percobaan #{p.no}</strong>
      <div>{formatNumber(p.value, metric.digits)} {metric.unit}</div>
      <div className="log-tip-time">{p.time}</div>
      {p.note && <div className="log-tip-note">{p.note.length > 140 ? `${p.note.slice(0, 140)}…` : p.note}</div>}
    </div>
  );
}

function LogChart({ list, metric }: { list: Experiment[]; metric: MetricDef }) {
  const start = Math.max(0, list.length - CHART_MAX);
  const slice = list.slice(start);
  const data: LogPoint[] = slice.map((e, i) => ({
    name: `#${start + i + 1}`,
    no: start + i + 1,
    value: Number(metric.get(e).toFixed(metric.digits + 2)),
    note: e.note,
    time: formatTime(e.time),
    rank: i === slice.length - 1 ? 0 : i === slice.length - 2 ? 1 : 2,
  }));
  return (
    <div
      className="chart-area log-chart"
      role="img"
      aria-label={`Grafik batang ${metric.label} untuk ${data.length} percobaan terakhir`}
    >
      <div className="metric-label">{metric.label} per percobaan · {metric.unit}</div>
      <ResponsiveContainer width="100%" height="86%">
        <BarChart data={data} margin={{ top: 14, right: 8, left: -8, bottom: 3 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={data.length > 12 ? 1 : 0} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip content={<LogTip metric={metric} />} cursor={{ fill: 'hsl(var(--muted) / .45)' }} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={metric.color} fillOpacity={d.rank === 0 ? 1 : d.rank === 1 ? 0.65 : 0.32} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompareCards({ list }: { list: Experiment[] }) {
  const n = list.length;
  if (n < 2) {
    return (
      <div className="log-empty" style={{ marginBottom: 14 }}>
        Catat minimal 2 percobaan untuk melihat perbandingan dengan percobaan sebelumnya.
      </div>
    );
  }
  const last = list[n - 1];
  const prev = list[n - 2];
  return (
    <div className="log-compare" data-testid="log-compare">
      <div className="metric-label" style={{ marginBottom: 8 }}>PERCOBAAN #{n} DIBANDING #{n - 1}</div>
      <div className="metrics-grid">
        {LOG_METRICS.map((m) => {
          const d = m.get(last) - m.get(prev);
          const rounded = Number(Math.abs(d).toFixed(m.digits));
          const better = rounded === 0 ? null : (d < 0) === m.lowerIsBetter;
          const p = m.id === 'saving' ? null : pctChange(m.get(last), m.get(prev));
          const arrow = rounded === 0 ? '＝' : d > 0 ? '▲' : '▼';
          return (
            <div className="metric-card" key={m.id}>
              <div className="metric-label">{m.label.toUpperCase()}</div>
              <div className="metric-value">{formatNumber(m.get(last), m.digits)} {m.unit}</div>
              <div className={`log-delta ${better === null ? '' : better ? 'log-good' : 'log-bad'}`}>
                {arrow} {signedNumber(d, m.digits)}{m.id === 'saving' ? ' poin' : ''}
                {p !== null && rounded !== 0 ? ` (${signedNumber(p, 1)}%)` : ''}
              </div>
              <div className="metric-unit">sebelumnya {formatNumber(m.get(prev), m.digits)} {m.unit}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pusat data hidup: setiap slider menggerakkan bagian visual          */
/* ------------------------------------------------------------------ */

type SceneTarget = {
  itRatio: number; // beban IT relatif terhadap kondisi saat ini
  pue: number;
  renew: number; // porsi pasokan terbarukan 0..1
  solar: number; // bagian surya dari terbarukan 0..1
  match: number; // kecocokan waktu 0..1
  eta: number; // efisiensi baterai 0..1
  totalKwh: number;
  itKwh: number;
  demandKwh: number;
  nowKwh: number;
  refKwh: number;
  reboundKwh: number;
  emissions: number; // kt CO2e
  emissionsRef: number;
};

const ZONE_RECT: Record<Zone, { x: number; y: number; w: number; h: number }> = {
  demand: { x: 346, y: 168, w: 218, h: 164 },
  efficiency: { x: 346, y: 168, w: 218, h: 164 },
  cooling: { x: 390, y: 90, w: 124, h: 44 },
  supply: { x: 100, y: 36, w: 164, h: 298 },
  storage: { x: 262, y: 288, w: 72, h: 50 },
  cost: { x: 588, y: 96, w: 118, h: 244 },
  rebound: { x: 588, y: 96, w: 118, h: 244 },
};

/* ------------------------------------------------------------------ */
/* Mesin 3D ringan (tanpa pustaka): proyeksi perspektif + painter      */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number];
type Cam = { yaw: number; pitch: number; dist: number };
type AnimState = {
  acc: number; phase: number; fan: number; fan2: number; turb: number; ray: number;
  offG: number; offD: number; offB: number; last: number;
};
type Scene3DOpts = { small: boolean; zone: ZoneState | null; pulse: number };
type Prim =
  | { t: 0; d: number; xy: number[]; fill: string; a: number; edge: string | null }
  | { t: 1; d: number; x: number; y: number; r: number; fill: string; a: number }
  | { t: 2; d: number; x1: number; y1: number; x2: number; y2: number; color: string; w: number; a: number };

const CAM_DEFAULT: Cam = { yaw: -0.62, pitch: 0.5, dist: 20 };

// Titik penting di dunia 3D (satuan bebas). Dipakai untuk label dan sorotan bagian yang diubah.
const ZONE3D: Record<Zone, { x: number; y: number; z: number; r: number; ly: number }> = {
  demand: { x: 3.6, y: 0.02, z: 0.2, r: 3.5, ly: 3.9 },
  efficiency: { x: 3.6, y: 0.02, z: 0.2, r: 3.5, ly: 3.9 },
  cooling: { x: 3.7, y: 3.05, z: 0.25, r: 1.5, ly: 4.0 },
  supply: { x: -2.6, y: 0.02, z: 0.4, r: 3.7, ly: 4.6 },
  storage: { x: 0.3, y: 0.02, z: -2.3, r: 1.3, ly: 1.6 },
  cost: { x: 7.6, y: 0.02, z: 0, r: 1.8, ly: 5.2 },
  rebound: { x: 7.6, y: 0.02, z: 0, r: 1.8, ly: 5.2 },
};

const hexCache = new Map<string, [number, number, number]>();
function hexRgb(hex: string): [number, number, number] {
  let v = hexCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(hex, v);
  }
  return v;
}
const shadeCache = new Map<string, string>();
function shadeHex(hex: string, f: number): string {
  const q = Math.round(f * 24);
  const key = `${hex}|${q}`;
  let s = shadeCache.get(key);
  if (!s) {
    const [r, g, b] = hexRgb(hex);
    const k = q / 24;
    s = `rgb(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g * k))},${Math.min(255, Math.round(b * k))})`;
    shadeCache.set(key, s);
  }
  return s;
}

const LIGHT_DIR: V3 = [-0.4, 0.8, -0.45];

function render3D(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  cam: Cam,
  c: SceneTarget,
  a: AnimState,
  P: ScenePalette,
  o: Scene3DOpts,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  /* ---------- kamera ---------- */
  const T: V3 = [1.0, 1.0, 0.2];
  const cosY = Math.cos(cam.yaw);
  const sinY = Math.sin(cam.yaw);
  const cosP = Math.cos(cam.pitch);
  const sinP = Math.sin(cam.pitch);
  const D = cam.dist;
  const f = Math.min(h * 1.32, w * 0.8);
  const cx = w / 2;
  const cy = h * 0.54;
  const camX = T[0] - D * cosP * sinY;
  const camY = T[1] + D * sinP;
  const camZ = T[2] - D * cosP * cosY;
  const out = [0, 0, 0];
  const pr = (x: number, y: number, z: number): number => {
    const dx = x - T[0];
    const dy = y - T[1];
    const dz = z - T[2];
    const x1 = dx * cosY - dz * sinY;
    const z1 = dx * sinY + dz * cosY;
    const y2 = dy * cosP + z1 * sinP;
    const z2 = -dy * sinP + z1 * cosP + D;
    const s = f / Math.max(0.5, z2);
    out[0] = cx + x1 * s;
    out[1] = cy - y2 * s;
    out[2] = z2;
    return s;
  };

  const ws = w / 760; // skala garis terhadap lebar kanvas
  const prims: Prim[] = [];

  const poly = (pts: number[], fill: string, alpha: number, edge: string | null, depth?: number): number => {
    const n = pts.length / 3;
    const xy: number[] = [];
    let dsum = 0;
    for (let i = 0; i < n; i += 1) {
      pr(pts[3 * i], pts[3 * i + 1], pts[3 * i + 2]);
      xy.push(out[0], out[1]);
      dsum += out[2];
    }
    const d = depth !== undefined ? depth : dsum / n;
    prims.push({ t: 0, d, xy, fill, a: alpha, edge });
    return d;
  };

  // Sisi bercahaya: normal eksplisit, disembunyikan bila membelakangi kamera.
  const face = (pts: number[], n: V3, base: string, alpha: number, edge: string | null, bias: number): number => {
    const m = pts.length / 3;
    let fx = 0;
    let fy = 0;
    let fz = 0;
    for (let i = 0; i < m; i += 1) {
      fx += pts[3 * i];
      fy += pts[3 * i + 1];
      fz += pts[3 * i + 2];
    }
    fx /= m; fy /= m; fz /= m;
    if (n[0] * (camX - fx) + n[1] * (camY - fy) + n[2] * (camZ - fz) <= 0) return NaN;
    const lam = Math.max(0, n[0] * LIGHT_DIR[0] + n[1] * LIGHT_DIR[1] + n[2] * LIGHT_DIR[2]);
    const d = poly(pts, shadeHex(base, 0.55 + 0.5 * lam), alpha, edge, undefined) + bias;
    prims[prims.length - 1].d = d;
    return d;
  };

  // Balok: mengembalikan kedalaman sisi atas dan sisi depan (-z).
  const box = (
    x0: number, x1: number, y0: number, y1: number, z0: number, z1: number,
    base: string, alpha = 1, edge: string | null = null, bias = 0,
  ): [number, number] => {
    const dTop = face([x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1], [0, 1, 0], base, alpha, edge, bias);
    const dFront = face([x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0], [0, 0, -1], base, alpha, edge, bias);
    face([x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1], [0, 0, 1], base, alpha, edge, bias);
    face([x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1], [-1, 0, 0], base, alpha, edge, bias);
    face([x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0], [1, 0, 0], base, alpha, edge, bias);
    return [dTop, dFront];
  };

  // Tabung / kerucut terpotong dengan sisi poligon.
  const cyl = (
    x: number, z: number, y0: number, y1: number, r0: number, r1: number, sides: number,
    base: string, alpha = 1, edge: string | null = null,
  ) => {
    for (let i = 0; i < sides; i += 1) {
      const a0 = (i / sides) * Math.PI * 2;
      const a1 = ((i + 1) / sides) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      face(
        [
          x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0,
          x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0,
          x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1,
          x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1,
        ],
        [Math.cos(am), 0, Math.sin(am)], base, alpha, edge, 0,
      );
    }
    const cap: number[] = [];
    for (let i = 0; i < sides; i += 1) {
      const ang = (i / sides) * Math.PI * 2;
      cap.push(x + Math.cos(ang) * r1, y1, z + Math.sin(ang) * r1);
    }
    face(cap, [0, 1, 0], base, alpha, edge, 0);
  };

  const dot = (x: number, y: number, z: number, rWorld: number, fill: string, alpha: number) => {
    const s = pr(x, y, z);
    prims.push({ t: 1, d: out[2], x: out[0], y: out[1], r: Math.max(0.7, rWorld * s), fill, a: alpha });
  };
  const seg = (
    x1: number, y1: number, z1: number, x2: number, y2: number, z2: number,
    color: string, wpx: number, alpha: number, depth?: number,
  ) => {
    pr(x1, y1, z1);
    const ax = out[0];
    const ay = out[1];
    const ad = out[2];
    pr(x2, y2, z2);
    prims.push({ t: 2, d: depth !== undefined ? depth : (ad + out[2]) / 2, x1: ax, y1: ay, x2: out[0], y2: out[1], color, w: wpx, a: alpha });
  };

  /* ---------- nilai turunan dari target ---------- */
  const heat = clamp((c.pue - 1) / 0.9, 0.1, 1);
  const gridShare = clamp(1 - c.renew, 0, 1);
  const sunSig = clamp(c.renew * c.solar, 0, 1);
  const windSig = clamp(c.renew * (1 - c.solar), 0, 1);
  const sunO = 0.3 + 0.7 * sunSig;
  const windO = 0.3 + 0.7 * windSig;
  const directShare = c.renew * c.match;
  const storedShare = c.renew * (1 - c.match);
  const litCount = c.itRatio * 16;
  const emissionScale = c.emissionsRef > 0 ? clamp(c.emissions / c.emissionsRef, 0, 1.2) : 0;
  const ref = c.refKwh > 0 ? c.refKwh : 1;
  const HMAX = 4.4;
  const hDemand = HMAX * (c.demandKwh / ref);
  const hNow = HMAX * (c.nowKwh / ref);
  const hTotal = HMAX * (c.totalKwh / ref);
  const hIt = clamp(HMAX * (c.itKwh / ref), 0, hTotal);
  const hReb = HMAX * (c.reboundKwh / ref);
  const hRenew = hTotal * clamp(c.renew, 0, 1);

  /* ---------- matahari (latar) ---------- */
  {
    const s = pr(-6.8, 6.0, 4.6);
    const sx = out[0];
    const sy = out[1];
    const rr = (0.75 + 0.25 * sunSig) * s;
    ctx.globalAlpha = sunO;
    ctx.fillStyle = '#f2b94b';
    ctx.beginPath();
    ctx.arc(sx, sy, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2b94b';
    ctx.lineWidth = 2.2 * ws + 0.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i += 1) {
      const ang = (i * Math.PI) / 4 + a.ray;
      const r1 = rr * 1.45;
      const r2 = rr * (1.8 + 0.5 * sunSig);
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(ang) * r1, sy + Math.sin(ang) * r1);
      ctx.lineTo(sx + Math.cos(ang) * r2, sy + Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- tanah, kisi, dan jalur di permukaan tanah ---------- */
  const gpath = (pts: Array<[number, number]>, y: number) => {
    ctx.beginPath();
    pts.forEach(([x, z], i) => {
      pr(x, y, z);
      if (i === 0) ctx.moveTo(out[0], out[1]);
      else ctx.lineTo(out[0], out[1]);
    });
  };
  const GX = 10.4;
  const GZ = 6.8;
  gpath([[-GX, -GZ], [GX, -GZ], [GX, GZ], [-GX, GZ]], 0);
  ctx.closePath();
  ctx.fillStyle = P.groundFill;
  ctx.fill();
  ctx.strokeStyle = P.ground;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = P.gridLine;
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.65;
  for (let gx = -GX + 2.6; gx < GX - 0.1; gx += 2.6) {
    gpath([[gx, -GZ], [gx, GZ]], 0);
    ctx.stroke();
  }
  for (let gz = -GZ + 2.27; gz < GZ - 0.1; gz += 2.27) {
    gpath([[-GX, gz], [GX, gz]], 0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // lantai pusat data
  gpath([[1.5, -1.8], [5.7, -1.8], [5.7, 2.2], [1.5, 2.2]], 0.01);
  ctx.closePath();
  ctx.fillStyle = P.bldFill;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Jaringan internet: jalur antar simpul
  const NODE3: Record<keyof typeof NET, [number, number]> = {
    P: [-7.9, 3.4], H: [-6.2, -0.5], A: [-8.7, 0.1], B: [-7.7, -3.7], C: [-4.7, -3.3], D: [-4.5, 0.3],
  };
  ctx.strokeStyle = P.netLink;
  ctx.lineWidth = 1.7 * ws + 0.4;
  ctx.lineCap = 'round';
  NET_LINKS.forEach(([from, to]) => {
    gpath([NODE3[from], NODE3[to]], 0.02);
    ctx.stroke();
  });

  // jalur aliran listrik (garis putus-putus bergerak)
  const dashed = (pts: Array<[number, number]>, color: string, widthPx: number, alpha: number, offset: number) => {
    ctx.setLineDash([7 * ws + 2, 9 * ws + 2]);
    ctx.lineDashOffset = -offset * ws;
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx * ws + 0.5;
    ctx.globalAlpha = alpha;
    gpath(pts, 0.03);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };
  const JN: [number, number] = [-1.2, 0.6];
  dashed([NODE3.H, [-3.6, -0.9], [-0.6, -0.6], [1.5, -0.6]], P.orange, 1 + 7 * gridShare, 0.2 + 0.8 * gridShare, a.offG);
  dashed([[-2.8, 3.4], [-2.1, 1.9], JN], P.green, 0.8 + 5 * windSig, 0.2 + 0.8 * windSig, a.offD);
  dashed([[-2.7, -2.7], [-1.9, -1.2], JN], P.green, 0.8 + 5 * sunSig, 0.2 + 0.8 * sunSig, a.offD);
  dashed([JN, [1.5, 0.6]], P.green, 1 + 7 * directShare, 0.2 + 0.8 * directShare, a.offD);
  dashed([JN, [-0.5, -1.0], [0.3, -2.0]], P.green, 1 + 7 * storedShare, 0.2 + 0.8 * storedShare, a.offB);
  dashed([[0.8, -2.2], [1.5, -1.3]], P.green, 1 + 7 * storedShare, 0.2 + 0.8 * storedShare, a.offB);

  // cincin denyut di gardu induk
  {
    const ph = (a.phase * 0.6) % 1;
    const rr = 0.7 + 1.1 * ph;
    ctx.beginPath();
    for (let i = 0; i <= 28; i += 1) {
      const ang = (i / 28) * Math.PI * 2;
      pr(NODE3.H[0] + Math.cos(ang) * rr, 0.03, NODE3.H[1] + Math.sin(ang) * rr);
      if (i === 0) ctx.moveTo(out[0], out[1]);
      else ctx.lineTo(out[0], out[1]);
    }
    ctx.strokeStyle = P.hub;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = (1 - ph) * (0.2 + 0.6 * gridShare);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------- objek 3D ---------- */

  // jaringan: pembangkit, gardu induk, pelanggan
  box(-8.6, -7.2, 0, 0.9, 3.0, 4.0, P.netNode, 1, P.netStroke, 0);
  box(-8.45, -7.35, 0.3, 0.55, 2.97, 3.0, P.orange, 1, null, -0.05);
  cyl(-7.6, 3.6, 0.9, 2.3, 0.16, 0.16, 8, P.netNode, 1, P.netStroke);
  (['A', 'B', 'C', 'D'] as const).forEach((k) => {
    cyl(NODE3[k][0], NODE3[k][1], 0, 0.2, 0.36, 0.36, 8, P.netNode, 1, P.netStroke);
    dot(NODE3[k][0], 0.24, NODE3[k][1], 0.1, P.netLink, 1);
  });
  cyl(NODE3.H[0], NODE3.H[1], 0, 0.32, 0.62, 0.62, 10, P.netNode, 1, P.hub);
  dot(NODE3.H[0], 0.36, NODE3.H[1], 0.24, P.hub, 1);

  // aliran dari pembangkit ke gardu dan distribusi ke pelanggan
  for (let j = 0; j < 3; j += 1) {
    const fr = (a.phase * 0.45 + j / 3) % 1;
    dot(
      NODE3.P[0] + (NODE3.H[0] - NODE3.P[0]) * fr, 0.14, NODE3.P[1] + (NODE3.H[1] - NODE3.P[1]) * fr,
      0.08 + 0.08 * gridShare, P.orange, 0.25 + 0.75 * gridShare,
    );
  }
  (['A', 'D', 'C'] as const).forEach((k, i) => {
    const fr = (a.phase * 0.3 + i * 0.31) % 1;
    dot(
      NODE3.H[0] + (NODE3[k][0] - NODE3.H[0]) * fr, 0.14, NODE3.H[1] + (NODE3[k][1] - NODE3.H[1]) * fr,
      0.07, P.orange, 0.55,
    );
  });

  // asap emisi dari cerobong pembangkit
  const puffN = o.small ? 3 : 4;
  for (let i = 0; i < puffN; i += 1) {
    const fr = (a.phase * 0.22 + i / puffN) % 1;
    dot(
      -7.6 + Math.sin(i * 2 + a.phase) * 0.15 + fr * 0.55, 2.4 + fr * 2.6, 3.6 + fr * 0.4,
      (0.2 + 0.55 * emissionScale) * (0.6 + fr * 0.8), P.smoke,
      Math.sin(Math.PI * fr) * (0.15 + 0.55 * emissionScale),
    );
  }

  // turbin angin
  {
    const tx = -2.8;
    const tz = 3.4;
    for (let i = 0; i < 6; i += 1) {
      const a0 = (i / 6) * Math.PI * 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      face(
        [
          tx + Math.cos(a0) * 0.2, 0, tz + Math.sin(a0) * 0.2,
          tx + Math.cos(a1) * 0.2, 0, tz + Math.sin(a1) * 0.2,
          tx + Math.cos(a1) * 0.09, 3.6, tz + Math.sin(a1) * 0.09,
          tx + Math.cos(a0) * 0.09, 3.6, tz + Math.sin(a0) * 0.09,
        ],
        [Math.cos(am), 0, Math.sin(am)], P.towerFill, windO, null, 0,
      );
    }
    box(tx - 0.13, tx + 0.13, 3.5, 3.72, tz - 0.3, tz + 0.28, P.towerFill, windO, null, -0.05);
    const hubZ = tz - 0.34;
    dot(tx, 3.6, hubZ, 0.13, P.green, windO);
    pr(tx, 3.6, hubZ);
    const bd = out[2] - 0.15;
    for (let k = 0; k < 3; k += 1) {
      const th = a.turb + (k * Math.PI * 2) / 3;
      const cs = Math.cos(th);
      const sn = Math.sin(th);
      const bp = (lx: number, ly: number): [number, number] => [tx + lx * cs - ly * sn, 3.6 + lx * sn + ly * cs];
      const p1 = bp(-0.09, 0.12);
      const p2 = bp(0.09, 0.12);
      const p3 = bp(0.035, 1.75);
      const p4 = bp(-0.035, 1.75);
      poly([p1[0], p1[1], hubZ, p2[0], p2[1], hubZ, p3[0], p3[1], hubZ, p4[0], p4[1], hubZ], P.blade, windO, P.towerFill, bd);
    }
  }

  // panel surya
  {
    const sn: V3 = [0, 0.8, -0.6];
    [[-4.3, -2.9], [-2.7, -1.3]].forEach(([xa, xb]) => {
      const dFace = face([xa, 0.2, -3.5, xb, 0.2, -3.5, xb, 0.95, -2.75, xa, 0.95, -2.75], sn, P.panelFill, sunO, P.panelLine, 0);
      if (!Number.isNaN(dFace)) {
        const xm = (xa + xb) / 2;
        seg(xm, 0.2, -3.5, xm, 0.95, -2.75, P.panelLine, 0.9, sunO, dFace - 0.02);
        seg(xa, 0.575, -3.125, xb, 0.575, -3.125, P.panelLine, 0.9, sunO, dFace - 0.02);
      }
    });
  }

  // baterai
  {
    const [, bFront] = box(-0.2, 0.8, 0, 0.75, -2.7, -1.9, P.battBg, 1, P.green, 0);
    box(0.25, 0.45, 0.75, 0.86, -2.45, -2.15, P.green, 1, null, 0);
    if (!Number.isNaN(bFront)) {
      const fillW = 0.8 * clamp(1 - c.match, 0, 1);
      if (fillW > 0.01) {
        poly([-0.1, 0.12, -2.704, -0.1 + fillW, 0.12, -2.704, -0.1 + fillW, 0.63, -2.704, -0.1, 0.63, -2.704], P.green, 0.88, null, bFront - 0.02);
      }
      const loss = clamp((1 - c.eta) * 1.6, 0, 0.5);
      if (loss > 0.02) {
        poly([-0.2, 0, -2.706, 0.8, 0, -2.706, 0.8, 0.75, -2.706, -0.2, 0.75, -2.706], P.orange, loss, null, bFront - 0.03);
      }
    }
  }

  // pusat data: rak server di dalam, lalu dinding kaca tembus pandang
  for (let col = 0; col < 4; col += 1) {
    const rx = 2.1 + col * 0.95;
    const [, rFront] = box(rx, rx + 0.7, 0, 2.0, -0.5, 0.4, P.rackFill, 1, P.bldLine, 0.5);
    if (Number.isNaN(rFront)) continue;
    for (let r = 0; r < 10; r += 1) {
      const level = clamp(litCount - (r * 4 + col), 0, 1);
      const y0 = 0.08 + r * 0.19;
      const zf = -0.504;
      poly([rx + 0.07, y0, zf, rx + 0.63, y0, zf, rx + 0.63, y0 + 0.13, zf, rx + 0.07, y0 + 0.13, zf], P.slotOff, 1, null, rFront - 0.02);
      if (level > 0.02) {
        poly([rx + 0.07, y0, zf - 0.002, rx + 0.63, y0, zf - 0.002, rx + 0.63, y0 + 0.13, zf - 0.002, rx + 0.07, y0 + 0.13, zf - 0.002], P.slotOn, level, null, rFront - 0.03);
        if (!o.small && level > 0.3) {
          const blink = 0.6 + 0.4 * Math.sin(a.phase * (2 + ((r * 4 + col) % 5) * 0.7) + r * 4 + col);
          pr(rx + 0.55, y0 + 0.065, zf - 0.004);
          const s = f / Math.max(0.5, out[2]);
          prims.push({ t: 1, d: rFront - 0.04, x: out[0], y: out[1], r: Math.max(0.8, 0.035 * s), fill: P.led, a: level * blink });
        }
      }
    }
  }
  box(1.5, 5.7, 0, 2.6, -1.8, 2.2, P.shell, 0.3, P.bldLine, 0);

  // unit pendingin di atap dan kipasnya
  {
    const [rTop] = box(2.9, 4.5, 2.6, 3.0, -0.4, 0.9, P.roofFill, 1, P.roofLine, -0.6);
    if (!Number.isNaN(rTop)) {
      [3.3, 4.1].forEach((fx, idx) => {
        const ang = idx === 0 ? a.fan : a.fan2;
        const disc: number[] = [];
        for (let i = 0; i < 12; i += 1) {
          const an = (i / 12) * Math.PI * 2;
          disc.push(fx + Math.cos(an) * 0.34, 3.01, 0.25 + Math.sin(an) * 0.34);
        }
        poly(disc, P.fanBg, 1, P.roofLine, rTop - 0.02);
        for (let k = 0; k < 4; k += 1) {
          const th = ang + (k * Math.PI) / 2;
          const cs = Math.cos(th);
          const sn = Math.sin(th);
          const bp = (lx: number, lz: number): [number, number] => [fx + lx * cs - lz * sn, 0.25 + lx * sn + lz * cs];
          const q1 = bp(-0.05, 0.04);
          const q2 = bp(0.05, 0.04);
          const q3 = bp(0.025, 0.31);
          const q4 = bp(-0.025, 0.31);
          poly([q1[0], 3.02, q1[1], q2[0], 3.02, q2[1], q3[0], 3.02, q3[1], q4[0], 3.02, q4[1]], P.fanBlade, 1, null, rTop - 0.04);
        }
      });
    }
  }
  // panas yang naik dari atap
  for (let i = 0; i < 6; i += 1) {
    const fr = (a.phase * 0.35 + i / 6) % 1;
    dot(2.4 + i * 0.62, 2.7 + fr * 1.3, 0.1 + Math.sin(i + a.phase) * 0.2, 0.11, P.wave, Math.sin(Math.PI * fr) * heat * 0.8);
  }

  // menara energi tahunan
  box(7.05, 8.15, 0, Math.max(0.001, hIt), -0.55, 0.55, '#287f69', 1, null, 0);
  if (hTotal - hIt > 0.005) box(7.05, 8.15, hIt, hTotal, -0.55, 0.55, '#5798a2', 1, null, 0);
  if (hReb > 0.03) box(7.05, 8.15, hTotal, hTotal + hReb, -0.55, 0.55, '#5798a2', 0.25, P.strong, 0);
  if (hTotal - hRenew > 0.005) box(6.25, 6.75, hRenew, hTotal, -0.25, 0.25, P.orange, 1, null, 0);
  if (hRenew > 0.005) box(6.25, 6.75, 0, hRenew, -0.25, 0.25, P.green, 1, null, 0);

  /* ---------- gambar semua objek dari jauh ke dekat ---------- */
  prims.sort((p, q) => q.d - p.d);
  for (let i = 0; i < prims.length; i += 1) {
    const p = prims[i];
    ctx.globalAlpha = p.a;
    if (p.t === 0) {
      ctx.beginPath();
      ctx.moveTo(p.xy[0], p.xy[1]);
      for (let k = 2; k < p.xy.length; k += 2) ctx.lineTo(p.xy[k], p.xy[k + 1]);
      ctx.closePath();
      ctx.fillStyle = p.fill;
      ctx.fill();
      if (p.edge) {
        ctx.strokeStyle = p.edge;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    } else if (p.t === 1) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.fill;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.w;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  /* ---------- lapisan atas: garis bantu, label, sorotan ---------- */
  const wire = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    pr(x0, y0, z0);
    ctx.moveTo(out[0], out[1]);
    pr(x1, y1, z1);
    ctx.lineTo(out[0], out[1]);
  };
  // kotak garis putus-putus = proyeksi tanpa tindakan
  if (hDemand > 0.02) {
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = P.label;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const xa = 7.05;
    const xb = 8.15;
    const za = -0.55;
    const zb = 0.55;
    wire(xa, hDemand, za, xb, hDemand, za); wire(xb, hDemand, za, xb, hDemand, zb);
    wire(xb, hDemand, zb, xa, hDemand, zb); wire(xa, hDemand, zb, xa, hDemand, za);
    wire(xa, 0, za, xa, hDemand, za); wire(xb, 0, za, xb, hDemand, za);
    wire(xa, 0, zb, xa, hDemand, zb); wire(xb, 0, zb, xb, hDemand, zb);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // cincin tipis = level saat ini
  if (hNow > 0.02) {
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = P.strong;
    ctx.lineWidth = 1;
    ctx.beginPath();
    wire(6.95, hNow, -0.65, 8.25, hNow, -0.65); wire(8.25, hNow, -0.65, 8.25, hNow, 0.65);
    wire(8.25, hNow, 0.65, 6.95, hNow, 0.65); wire(6.95, hNow, 0.65, 6.95, hNow, -0.65);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const fontPx = clamp(w / 62, 10, 15);
  const label = (text: string, x: number, y: number, z: number, color: string, align: CanvasTextAlign = 'center') => {
    pr(x, y, z);
    ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const tw = ctx.measureText(text).width;
    let lx = align === 'center' ? out[0] - tw / 2 : align === 'right' ? out[0] - tw : out[0];
    lx = clamp(lx, 4, Math.max(4, w - tw - 4));
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = P.haloBg;
    ctx.strokeText(text, lx, out[1]);
    ctx.fillStyle = color;
    ctx.fillText(text, lx, out[1]);
  };
  label(o.small ? 'Jaringan' : 'Jaringan internet', -6.6, 0, -5.2, P.label);
  label(o.small ? 'Surya/angin' : 'Surya dan angin', -2.5, 0, -4.7, P.label);
  if (!o.small) label('Baterai', 0.3, 0, -3.5, P.label);
  label('Pusat data', 3.6, 0, -3.1, P.label);
  if (!o.small) label('Sumber', 6.5, 0, -1.2, P.label);
  label('Beban', 7.6, 0, -1.9, P.label);
  label(`PUE ${c.pue.toFixed(2).replace('.', ',')}`, 3.6, 3.85, 0.3, P.strong);
  if (hDemand > 0.1) label(o.small ? 'tanpa aksi' : 'tanpa tindakan', 8.3, hDemand, 0, P.label, 'left');
  if (!o.small && hNow > 0.1 && Math.abs(hDemand - hNow) > 0.25) label('saat ini', 8.3, hNow, 0, P.strong, 'left');
  if (hReb > 0.2) label('rebound', 8.3, hTotal + hReb / 2, 0, P.strong, 'left');

  // sorotan bagian yang sedang diubah
  if (o.zone) {
    const zc = ZONE_COLOR[o.zone.id];
    const zd = ZONE3D[o.zone.id];
    ctx.beginPath();
    for (let i = 0; i <= 36; i += 1) {
      const ang = (i / 36) * Math.PI * 2;
      pr(zd.x + Math.cos(ang) * zd.r, zd.y, zd.z + Math.sin(ang) * zd.r * 0.8);
      if (i === 0) ctx.moveTo(out[0], out[1]);
      else ctx.lineTo(out[0], out[1]);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.09 * o.pulse;
    ctx.fillStyle = zc;
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5 * o.pulse;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = zc;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    pr(zd.x, zd.ly, zd.z);
    const text = o.zone.text;
    ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width + 18;
    const th = fontPx + 9;
    const bx = clamp(out[0] - tw / 2, 4, Math.max(4, w - tw - 4));
    const by = clamp(out[1] - th / 2, 4, Math.max(4, h - th - 4));
    ctx.beginPath();
    const rad = th / 2;
    ctx.moveTo(bx + rad, by);
    ctx.arcTo(bx + tw, by, bx + tw, by + th, rad);
    ctx.arcTo(bx + tw, by + th, bx, by + th, rad);
    ctx.arcTo(bx, by + th, bx, by, rad);
    ctx.arcTo(bx, by, bx + tw, by, rad);
    ctx.closePath();
    ctx.fillStyle = zc;
    ctx.fill();
    ctx.fillStyle = '#0b1a17';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + tw / 2, by + th / 2 + 0.5);
  }
}

const DIST_MIN = 9;
const DIST_MAX = 38;
const PITCH_MIN = 0.1;
const PITCH_MAX = 1.3;

function Scene3D({
  cur,
  anim,
  zone,
  staticMode,
  small,
  drawRef,
}: {
  cur: { current: SceneTarget };
  anim: { current: AnimState };
  zone: ZoneState | null;
  staticMode: boolean;
  small: boolean;
  drawRef: { current: (() => void) | null };
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cam = useRef<Cam>({ ...CAM_DEFAULT });
  const size = useRef({ w: 760, h: 410, dpr: 1 });
  const { resolvedTheme } = useTheme();
  const P = resolvedTheme === 'dark' ? PAL_DARK : PAL_LIGHT;
  const [autoRot, setAutoRot] = useState(false);
  const [lite, setLite] = useState(false);
  const [autoLite, setAutoLite] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);

  // Nilai terbaru untuk fungsi gambar (agar loop animasi tidak memakai nilai usang).
  const live = useRef({ P, zone, small, staticMode, autoRot, lite });
  live.current = { P, zone, small, staticMode, autoRot, lite };
  const dragging = useRef(false);
  const visible = useRef(true);
  const lastDraw = useRef(0);
  const frame = useRef(0);
  const slow = useRef({ ema: 0, count: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const pending = useRef(false);

  const draw = () => {
    const ctx = ctxRef.current;
    if (!ctx || !visible.current) return;
    const L = live.current;
    frame.current += 1;
    // Mode hemat: gambar ±30 fps dan detail dikurangi.
    if (L.lite && !L.staticMode && frame.current % 2 === 0) return;
    const t0 = performance.now();
    const dt = lastDraw.current ? Math.min(0.1, (t0 - lastDraw.current) / 1000) : 0;
    lastDraw.current = t0;
    if (L.autoRot && !dragging.current) cam.current.yaw += dt * 0.35;
    const a = anim.current;
    const pulse = L.staticMode ? 1 : 0.55 + 0.45 * Math.sin(a.phase * 8);
    const { w, h, dpr } = size.current;
    render3D(ctx, w, h, dpr, cam.current, cur.current, a, L.P, { small: L.small || L.lite, zone: L.zone, pulse });
    // Pantau kinerja: bila gambar terlalu berat berkali-kali, pindah otomatis ke mode hemat.
    if (!L.lite && !L.staticMode) {
      const took = performance.now() - t0;
      const s = slow.current;
      s.ema = s.ema === 0 ? took : s.ema * 0.9 + took * 0.1;
      s.count = s.ema > 14 ? s.count + 1 : 0;
      if (s.count > 40) {
        s.count = 0;
        setLite(true);
        setAutoLite(true);
      }
    }
  };
  drawRef.current = draw;

  // Saat animasi mati, gambar ulang hanya ketika ada perubahan (digabung per frame).
  const redraw = () => {
    const L = live.current;
    if (L.autoRot || !L.staticMode || pending.current) return;
    pending.current = true;
    requestAnimationFrame(() => {
      pending.current = false;
      draw();
    });
  };

  const syncZoom = () => setZoomPct(Math.round((CAM_DEFAULT.dist / cam.current.dist) * 100));
  const zoomBy = (delta: number) => {
    cam.current.dist = clamp(cam.current.dist + delta, DIST_MIN, DIST_MAX);
    syncZoom();
    redraw();
  };
  const resetCam = () => {
    cam.current = { ...CAM_DEFAULT };
    syncZoom();
    redraw();
  };

  const applySize = () => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const L = live.current;
    const w = Math.max(240, Math.round(wrap.clientWidth));
    const h = Math.round(w * 0.54);
    const dpr = Math.min(window.devicePixelRatio || 1, L.lite ? 1 : L.small ? 1.5 : 2);
    const prev = size.current;
    if (ctxRef.current && prev.w === w && prev.h === h && prev.dpr === dpr) return;
    size.current = { w, h, dpr };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = `${h}px`;
    ctxRef.current = canvas.getContext('2d');
    draw();
  };

  useEffect(() => {
    applySize();
    const wrap = wrapRef.current;
    const ro = typeof ResizeObserver !== 'undefined' && wrap ? new ResizeObserver(() => applySize()) : null;
    if (ro && wrap) ro.observe(wrap);
    const onResize = () => applySize();
    window.addEventListener('resize', onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [small, lite]);

  useEffect(() => () => {
    drawRef.current = null;
  }, []);

  // Berhenti menggambar saat kanvas di luar layar.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const now = entries.some((e) => e.isIntersecting);
      const was = visible.current;
      visible.current = now;
      if (now && !was) {
        lastDraw.current = 0;
        redraw();
      }
    }, { threshold: 0.01 });
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  // Putar otomatis saat animasi umum mati: butuh loop sendiri.
  useEffect(() => {
    if (!(autoRot && staticMode)) return undefined;
    let raf = 0;
    lastDraw.current = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [autoRot, staticMode]);

  // Mode statis: gambar ulang setiap ada perubahan data, tema, atau sorotan.
  useEffect(() => {
    if (staticMode) draw();
  });

  // Zoom dengan scroll: hanya saat Ctrl/Cmd ditekan (atau cubit di trackpad) atau kanvas sedang difokuskan,
  // supaya scroll halaman biasa tidak terganggu.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey || document.activeElement === canvas)) return;
      event.preventDefault();
      zoomBy(clamp(event.deltaY, -60, 60) * 0.03);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const pinchDist = () => {
    const pts = Array.from(pointers.current.values());
    return pts.length < 2 ? 0 : Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.focus({ preventScroll: true });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* abaikan */
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging.current = true;
    if (pointers.current.size === 2) pinch.current = pinchDist();
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(event.pointerId);
    if (!prev) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 1) {
      cam.current.yaw += (next.x - prev.x) * 0.008;
      cam.current.pitch = clamp(cam.current.pitch + (next.y - prev.y) * 0.006, PITCH_MIN, PITCH_MAX);
    } else if (pointers.current.size === 2) {
      const d = pinchDist();
      if (pinch.current > 0 && d > 0) {
        cam.current.dist = clamp(cam.current.dist * (pinch.current / d), DIST_MIN, DIST_MAX);
        syncZoom();
      }
      pinch.current = d;
    }
    redraw();
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    dragging.current = pointers.current.size > 0;
    pinch.current = 0;
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const c = cam.current;
    let used = true;
    if (event.key === 'ArrowLeft') c.yaw -= 0.1;
    else if (event.key === 'ArrowRight') c.yaw += 0.1;
    else if (event.key === 'ArrowUp') c.pitch = clamp(c.pitch + 0.06, PITCH_MIN, PITCH_MAX);
    else if (event.key === 'ArrowDown') c.pitch = clamp(c.pitch - 0.06, PITCH_MIN, PITCH_MAX);
    else if (event.key === '+' || event.key === '=') zoomBy(-1.5);
    else if (event.key === '-' || event.key === '_') zoomBy(1.5);
    else if (event.key === '0') resetCam();
    else used = false;
    if (used) {
      event.preventDefault();
      redraw();
    }
  };

  const c = cur.current;
  return (
    <div className="dc-3d">
      <div ref={wrapRef} className="dc-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="dc-canvas"
          tabIndex={0}
          role="img"
          aria-label={`Model 3D pusat data yang bisa diputar: ${formatNumber(c.itRatio * 100, 0)}% beban IT dibanding saat ini, PUE ${formatNumber(c.pue, 2)}, ${formatNumber(c.renew * 100, 0)}% pasokan terbarukan. Gunakan tombol panah untuk memutar, plus dan minus untuk zoom, angka nol untuk mengatur ulang.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
          data-testid="canvas-3d"
        />
      </div>
      <div className="dc-3d-bar">
        <div className="dc-3d-btns">
          <button type="button" className="dc-anim dc-zoom-btn" onClick={() => zoomBy(-2)} aria-label="Perbesar (zoom in)" data-testid="button-zoom-in">＋</button>
          <span className="dc-zoom" aria-live="polite">{zoomPct}%</span>
          <button type="button" className="dc-anim dc-zoom-btn" onClick={() => zoomBy(2)} aria-label="Perkecil (zoom out)" data-testid="button-zoom-out">－</button>
          <button type="button" className="dc-anim" onClick={resetCam} data-testid="button-cam-reset">⟲ Atur ulang</button>
          <button type="button" className="dc-anim" aria-pressed={autoRot} onClick={() => setAutoRot((v) => !v)} data-testid="button-cam-auto">↻ Putar otomatis</button>
          <button
            type="button"
            className="dc-anim"
            aria-pressed={lite}
            onClick={() => { setLite((v) => !v); setAutoLite(false); }}
            title="Kurangi detail dan kecepatan gambar agar ringan di perangkat lambat"
            data-testid="button-lite"
          >
            ⚡ Mode hemat
          </button>
        </div>
        <p className="dc-3d-hint">
          Seret untuk memutar. Cubit layar atau pakai tombol ＋ dan － untuk zoom. Klik gambar lalu scroll (atau Ctrl + scroll) untuk zoom.
          {autoLite && lite ? ' Mode hemat dinyalakan otomatis agar tetap lancar di perangkat ini.' : ''}
        </p>
      </div>
    </div>
  );
}

function DataCenterScene({
  target,
  zone,
  staticMode,
  small,
  view,
}: {
  target: SceneTarget;
  zone: ZoneState | null;
  staticMode: boolean;
  small: boolean;
  view: '2d' | '3d';
}) {
  const cur = useRef<SceneTarget>({ ...target });
  const tgt = useRef<SceneTarget>(target);
  tgt.current = target;
  const anim = useRef<AnimState>({ acc: 0, phase: 1.3, fan: 0, fan2: 0, turb: 0, ray: 0, offG: 0, offD: 0, offB: 0, last: 0 });
  const [, setTick] = useState(0);
  const { resolvedTheme } = useTheme();
  const P = resolvedTheme === 'dark' ? PAL_DARK : PAL_LIGHT;
  const viewRef = useRef(view);
  viewRef.current = view;
  const draw3d = useRef<(() => void) | null>(null);

  // Gerak halus: setiap frame, nilai tampil mendekati nilai target dari slider.
  useEffect(() => {
    if (staticMode) return undefined;
    anim.current.last = 0;
    let raf = 0;
    const loop = (now: number) => {
      const a = anim.current;
      const dt = a.last ? Math.min(0.05, (now - a.last) / 1000) : 1 / 60;
      a.last = now;
      const k = 1 - Math.exp(-dt / 0.14);
      const c = cur.current;
      const t = tgt.current;
      (Object.keys(t) as Array<keyof SceneTarget>).forEach((key) => {
        c[key] += (t[key] - c[key]) * k;
      });
      const heat = clamp((c.pue - 1) / 0.9, 0.1, 1);
      const windSig = c.renew * (1 - c.solar);
      a.phase += dt;
      a.fan += dt * (2 + heat * 16);
      a.fan2 += dt * (2.4 + heat * 15);
      a.turb += dt * (0.5 + windSig * 7);
      a.ray += dt * 0.3;
      a.offG += dt * (12 + (1 - c.renew) * 70);
      a.offD += dt * (12 + c.renew * c.match * 70);
      a.offB += dt * (12 + c.renew * (1 - c.match) * 70);
      a.acc += dt;
      if (viewRef.current === '3d') {
        // Mode 3D: kanvas digambar langsung tanpa render ulang React; angka statistik diperbarui ±8 kali per detik.
        draw3d.current?.();
        if (a.acc >= 0.12) {
          a.acc = 0;
          setTick((n) => n + 1);
        }
      } else if (!small || a.acc >= 0.033) {
        // Di layar kecil gambar ulang ±30 fps saja agar ringan.
        a.acc = 0;
        setTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [staticMode, small]);

  // Mode statis: tampilkan nilai target langsung pada pose tetap.
  useEffect(() => {
    if (!staticMode) return;
    cur.current = { ...target };
    const a = anim.current;
    a.phase = 1.3;
    a.fan = 0; a.fan2 = 0; a.turb = 0; a.ray = 0; a.offG = 0; a.offD = 0; a.offB = 0;
    setTick((n) => n + 1);
  }, [target, staticMode]);

  const c = cur.current;
  const a = anim.current;
  const heat = clamp((c.pue - 1) / 0.9, 0.1, 1);
  const gridShare = clamp(1 - c.renew, 0, 1);
  const sunSig = clamp(c.renew * c.solar, 0, 1);
  const windSig = clamp(c.renew * (1 - c.solar), 0, 1);
  const sunO = 0.28 + 0.72 * sunSig;
  const windO = 0.28 + 0.72 * windSig;
  const directShare = c.renew * c.match;
  const storedShare = c.renew * (1 - c.match);
  const litCount = c.itRatio * 16; // 16 dari 40 slot = beban saat ini
  const emissionScale = c.emissionsRef > 0 ? clamp(c.emissions / c.emissionsRef, 0, 1.2) : 0;

  // Menara energi tahunan
  const base = 330;
  const hMax = 220;
  const ref = c.refKwh > 0 ? c.refKwh : 1;
  const hDemand = hMax * (c.demandKwh / ref);
  const hNow = hMax * (c.nowKwh / ref);
  const hTotal = hMax * (c.totalKwh / ref);
  const hIt = clamp(hMax * (c.itKwh / ref), 0, hTotal);
  const hReb = hMax * (c.reboundKwh / ref);
  const hRenew = hTotal * clamp(c.renew, 0, 1);

  const pulse = staticMode ? 1 : 0.55 + 0.45 * Math.sin(a.phase * 8);
  const zr = zone ? ZONE_RECT[zone.id] : null;
  const pillW = zone ? zone.text.length * (small ? 7.8 : 5.6) + 16 : 0;
  const pillH = small ? 24 : 18;

  const rackX = (col: number) => 350 + col * 54;
  const slots = [];
  for (let r = 0; r < 10; r += 1) {
    for (let col = 0; col < 4; col += 1) {
      const k = r * 4 + col;
      const level = clamp(litCount - k, 0, 1);
      const x = rackX(col) + 4;
      const y = base - 4 - 15 * (r + 1) + 3;
      const blink = 0.6 + 0.4 * Math.sin(a.phase * (2 + (k % 5) * 0.7) + k);
      slots.push(
        <g key={k}>
          <rect x={x} y={y} width="36" height="12" rx="2" fill={P.slotOff} />
          <rect x={x} y={y} width="36" height="12" rx="2" fill={P.slotOn} opacity={level} />
          <circle cx={x + 31} cy={y + 6} r="2.2" fill={P.led} opacity={level * blink} />
        </g>,
      );
    }
  }

  const waves = [];
  for (let col = 0; col < 4; col += 1) {
    for (let j = 0; j < 3; j += 1) {
      const frac = (a.phase * 0.35 + j / 3 + col * 0.17) % 1;
      waves.push(
        <path
          key={`${col}-${j}`}
          d="M0 0 q5 -7 0 -14 t0 -14"
          transform={`translate(${rackX(col) + 22 + (j - 1) * 11} ${172 - frac * 38})`}
          fill="none"
          stroke={P.wave}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={Math.sin(Math.PI * frac) * heat}
        />,
      );
    }
  }

  const puffs = [];
  for (let i = 0; i < 4; i += 1) {
    const frac = (a.phase * 0.22 + i / 4) % 1;
    puffs.push(
      <circle
        key={i}
        cx={40 + Math.sin(i * 2 + a.phase) * 5 + frac * 18}
        cy={150 - frac * 62}
        r={(4 + 13 * emissionScale) * (0.6 + frac * 0.8)}
        fill={P.smoke}
        opacity={Math.sin(Math.PI * frac) * (0.15 + 0.55 * emissionScale)}
      />,
    );
  }

  const fan = (cx: number, angle: number) => (
    <g key={cx}>
      <circle cx={cx} cy="113" r="11" fill={P.fanBg} stroke={P.roofLine} strokeWidth="1" />
      {[0, 90, 180, 270].map((deg) => (
        <path
          key={deg}
          d={`M${cx} 113 L${cx - 2.4} 104.5 Q${cx} 103.5 ${cx + 2.4} 104.5 Z`}
          fill={P.fanBlade}
          transform={`rotate(${deg + (angle * 180) / Math.PI} ${cx} 113)`}
        />
      ))}
    </g>
  );

  return (
    <>
      {view === '2d' ? (
      <svg
        className="dc-svg"
        viewBox="0 0 760 360"
        role="img"
        aria-label={`Ilustrasi pusat data yang terhubung ke Jaringan internet: ${formatNumber(c.itRatio * 100, 0)}% beban IT dibanding saat ini, PUE ${formatNumber(c.pue, 2)}, ${formatNumber(c.renew * 100, 0)}% pasokan terbarukan`}
      >
        <line x1="0" y1={base} x2="760" y2={base} stroke={P.ground} strokeWidth="2" />

        {/* Jaringan internet: pembangkit → gardu induk → pelanggan, saling terhubung */}
        <g aria-hidden="true">
          {/* jalur antar simpul */}
          {NET_LINKS.map(([from, to]) => (
            <line
              key={`${from}-${to}`}
              x1={NET[from].x} y1={NET[from].y} x2={NET[to].x} y2={NET[to].y}
              stroke={P.netLink} strokeWidth="1.6" strokeLinecap="round"
            />
          ))}
          {/* aliran listrik dari pembangkit ke gardu: makin banyak saat pasokan jaringan besar */}
          {[0, 1, 2].map((j) => {
            const f = (a.phase * 0.45 + j / 3) % 1;
            return (
              <circle
                key={`gen-${j}`}
                cx={NET.P.x + (NET.H.x - NET.P.x) * f}
                cy={NET.P.y + (NET.H.y - NET.P.y) * f}
                r={1.8 + 1.6 * gridShare}
                fill={P.orange}
                opacity={0.25 + 0.75 * gridShare}
              />
            );
          })}
          {/* distribusi ke pelanggan lain di jaringan */}
          {([['H', 'A'], ['H', 'D'], ['H', 'C']] as const).map(([from, to], k) => {
            const f = (a.phase * 0.3 + k * 0.31) % 1;
            return (
              <circle
                key={`dist-${from}-${to}`}
                cx={NET[from].x + (NET[to].x - NET[from].x) * f}
                cy={NET[from].y + (NET[to].y - NET[from].y) * f}
                r="1.6"
                fill={P.orange}
                opacity={0.55}
              />
            );
          })}

          {/* emisi dari pembangkit di jaringan */}
          {puffs}

          {/* pembangkit */}
          <rect x="42" y="154" width="6" height="14" fill={P.netNode} stroke={P.netStroke} strokeWidth="1.4" />
          <rect x="26" y="166" width="32" height="20" rx="3" fill={P.netNode} stroke={P.netStroke} strokeWidth="1.6" />
          <path d="M33 180 L38 172 L38 177 L45 177 L40 184 L40 180 Z" fill={P.orange} />

          {/* beban / pelanggan */}
          {(['A', 'B', 'C', 'D'] as const).map((k) => (
            <g key={k}>
              <circle cx={NET[k].x} cy={NET[k].y} r="6" fill={P.netNode} stroke={P.netStroke} strokeWidth="1.6" />
              <circle cx={NET[k].x} cy={NET[k].y} r="2.2" fill={P.netLink} />
            </g>
          ))}

          {/* gardu induk (hub) dengan cincin denyut */}
          <circle
            cx={NET.H.x} cy={NET.H.y}
            r={11 + 7 * ((a.phase * 0.6) % 1)}
            fill="none" stroke={P.hub} strokeWidth="1.2"
            opacity={(1 - ((a.phase * 0.6) % 1)) * (0.2 + 0.6 * gridShare)}
          />
          <circle cx={NET.H.x} cy={NET.H.y} r="11" fill={P.netNode} stroke={P.hub} strokeWidth="2.2" />
          <circle cx={NET.H.x} cy={NET.H.y} r="4.5" fill={P.hub} />
        </g>

        {/* matahari */}
        <g opacity={sunO}>
          <circle cx="215" cy="52" r={14 + 4 * sunSig} fill="#f2b94b" />
          <g stroke="#f2b94b" strokeWidth="2.5" strokeLinecap="round">
            {Array.from({ length: 8 }).map((_, i) => {
              const ang = (i * Math.PI) / 4 + a.ray;
              const r1 = 22 + 4 * sunSig;
              const r2 = r1 + 5 + 8 * sunSig;
              return (
                <line
                  key={i}
                  x1={215 + Math.cos(ang) * r1}
                  y1={52 + Math.sin(ang) * r1}
                  x2={215 + Math.cos(ang) * r2}
                  y2={52 + Math.sin(ang) * r2}
                />
              );
            })}
          </g>
        </g>

        {/* turbin angin */}
        <g opacity={windO}>
          <path d="M131 330 L135 160 L139 330 Z" fill={P.towerFill} />
          {[0, 120, 240].map((deg) => (
            <path
              key={deg}
              d="M135 160 L131.5 112 Q135 106 138.5 112 Z"
              fill={P.blade}
              transform={`rotate(${deg + (a.turb * 180) / Math.PI} 135 160)`}
            />
          ))}
          <circle cx="135" cy="160" r="4.5" fill={P.green} />
        </g>

        {/* panel surya */}
        <g opacity={sunO}>
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${166 + i * 42} 308)`}>
              <polygon points="0,20 8,0 38,0 30,20" fill={P.panelFill} stroke={P.panelLine} strokeWidth="1" />
              <line x1="19" y1="0" x2="15" y2="20" stroke={P.panelLine} strokeWidth=".8" />
              <line x1="4" y1="10" x2="34" y2="10" stroke={P.panelLine} strokeWidth=".8" />
            </g>
          ))}
        </g>

        {/* aliran listrik */}
        <path
          d="M72 233 C150 215, 250 205, 336 205"
          fill="none" stroke={P.orange} strokeLinecap="round" strokeDasharray="6 8"
          strokeDashoffset={-a.offG}
          strokeWidth={1 + 7 * gridShare}
          opacity={0.2 + 0.8 * gridShare}
        />
        <path
          d="M139 172 C160 250, 215 262, 262 262"
          fill="none" stroke={P.green} strokeLinecap="round" strokeDasharray="6 8"
          strokeDashoffset={-a.offD}
          strokeWidth={0.8 + 5 * windSig}
          opacity={0.2 + 0.8 * windSig}
        />
        <path
          d="M250 308 C258 290, 258 275, 262 262"
          fill="none" stroke={P.green} strokeLinecap="round" strokeDasharray="6 8"
          strokeDashoffset={-a.offD}
          strokeWidth={0.8 + 5 * sunSig}
          opacity={0.2 + 0.8 * sunSig}
        />
        <path
          d="M262 262 L336 262"
          fill="none" stroke={P.green} strokeLinecap="round" strokeDasharray="6 8"
          strokeDashoffset={-a.offD}
          strokeWidth={1 + 7 * directShare}
          opacity={0.2 + 0.8 * directShare}
        />
        <path
          d="M262 262 C262 322, 336 322, 336 288"
          fill="none" stroke={P.green} strokeLinecap="round" strokeDasharray="6 8"
          strokeDashoffset={-a.offB}
          strokeWidth={1 + 7 * storedShare}
          opacity={0.2 + 0.8 * storedShare}
        />
        <circle cx="262" cy="262" r="4" fill={P.green} />

        {/* baterai: isi = bagian yang digeser waktunya, rugi = 1 − efisiensi */}
        <g>
          <rect x="281" y="299" width="36" height="22" rx="3" fill={P.battBg} stroke={P.green} strokeWidth="1.2" />
          <rect x="317" y="306" width="3" height="8" fill={P.green} />
          <rect x="284" y="302" width={30 * clamp(1 - c.match, 0, 1)} height="16" rx="1.5" fill={P.green} opacity="0.85" />
          <rect x="281" y="299" width="36" height="22" rx="3" fill={P.orange} opacity={clamp((1 - c.eta) * 1.6, 0, 0.5)} />
        </g>

        {/* bangunan pusat data */}
        <rect x="336" y="130" width="228" height="200" rx="6" fill={P.bldFill} stroke={P.bldLine} strokeWidth="1.5" />
        <rect x="336" y="130" width="228" height="200" rx="6" fill={P.heat} opacity={0.1 * heat} />

        {/* unit pendingin di atap */}
        <rect x="396" y="98" width="108" height="32" rx="4" fill={P.roofFill} stroke={P.roofLine} strokeWidth="1.2" />
        {fan(424, a.fan)}
        {fan(476, a.fan2)}

        {/* rak server */}
        {[0, 1, 2, 3].map((col) => (
          <rect key={col} x={rackX(col)} y="174" width="44" height="154" rx="3" fill={P.rackFill} stroke={P.bldLine} />
        ))}
        {slots}
        {waves}

        {/* menara energi tahunan */}
        <rect x={620} y={base - hDemand} width="56" height={Math.max(0, hDemand)} fill="none" stroke={P.label} strokeWidth="1" strokeDasharray="4 3" />
        <rect x={620} y={base - hIt} width="56" height={Math.max(0, hIt)} fill="#287f69" />
        <rect x={620} y={base - hTotal} width="56" height={Math.max(0, hTotal - hIt)} fill="#5798a2" />
        {hReb > 1 && (
          <rect x={620} y={base - hTotal - hReb} width="56" height={hReb} fill="#5798a2" opacity="0.22" stroke={P.strong} strokeWidth="1" strokeDasharray="3 3" />
        )}
        <rect x={598} y={base - hTotal} width="12" height={Math.max(0, hTotal - hRenew)} fill={P.orange} />
        <rect x={598} y={base - hRenew} width="12" height={Math.max(0, hRenew)} fill={P.green} />
        <line x1="614" x2="682" y1={base - hNow} y2={base - hNow} stroke={P.strong} strokeWidth="1" strokeDasharray="2 2" />

        <g fontSize={small ? 12.5 : 9.5} fill={P.label}>
          <text x="684" y={base - hDemand + 3}>{small ? 'tanpa aksi' : 'tanpa tindakan'}</text>
          <text x="684" y={base - hNow + (Math.abs(hDemand - hNow) < 12 ? (small ? 16 : 13) : 3)} fill={P.strong}>saat ini</text>
          {hReb > 8 && <text x="684" y={base - hTotal - hReb / 2 + 3} fill={P.strong}>rebound</text>}
        </g>
        <g fontSize={small ? 14 : 10} fill={P.label} textAnchor="middle">
          <text x={small ? 44 : 60} y="350">{small ? 'Jaringan' : 'Jaringan internet'}</text>
          {!small && <text x="200" y="348">Surya dan angin</text>}
          {!small && (
            <text x="299" y="348">
              {`Baterai · rugi ${formatNumber((1 - c.eta) * 100, 0)}%`}
            </text>
          )}
          <text x={small ? 440 : 450} y="350">Pusat data</text>
          <text x={small ? 598 : 604} y="350">Sumber</text>
          <text x={small ? 652 : 648} y="350">Beban</text>
        </g>
        <text x="552" y="124" fontSize={small ? 14 : 11} fill={P.strong} textAnchor="end">
          PUE {formatNumber(c.pue, 2)}
        </text>

        {/* sorotan bagian yang sedang diubah */}
        {zone && zr && (
          <g pointerEvents="none">
            <rect
              x={zr.x} y={zr.y} width={zr.w} height={zr.h} rx="8"
              fill={ZONE_COLOR[zone.id]} fillOpacity={0.07 * pulse}
              stroke={ZONE_COLOR[zone.id]} strokeWidth="1.6" strokeDasharray="5 4"
              opacity={0.5 + 0.5 * pulse}
            />
            <rect x={zr.x} y={zr.y - pillH - 4} width={pillW} height={pillH} rx={pillH / 2} fill={ZONE_COLOR[zone.id]} />
            <text x={zr.x + pillW / 2} y={zr.y - 4 - pillH / 2 + (small ? 5 : 3.7)} fontSize={small ? 14 : 10.5} fontWeight="600" textAnchor="middle" fill="#0b1a17">
              {zone.text}
            </text>
          </g>
        )}
      </svg>
      ) : (
        <Scene3D cur={cur} anim={anim} zone={zone} staticMode={staticMode} small={small} drawRef={draw3d} />
      )}

      <div className="dc-stats">
        <div className="dc-stat">
          <div className="dc-stat-label">Listrik per tahun</div>
          <div className="dc-stat-value">{formatNumber(c.totalKwh / 1e9, 3)}<span className="dc-stat-unit">TWh</span></div>
        </div>
        <div className="dc-stat">
          <div className="dc-stat-label">Emisi operasional</div>
          <div className="dc-stat-value">{formatNumber(c.emissions, 2)}<span className="dc-stat-unit">kt CO₂e</span></div>
        </div>
        <div className="dc-stat">
          <div className="dc-stat-label">Beban IT</div>
          <div className="dc-stat-value">{formatNumber(c.itKwh / 8.76e6, 2)}<span className="dc-stat-unit">MW</span></div>
        </div>
        <div className="dc-stat">
          <div className="dc-stat-label">PUE</div>
          <div className="dc-stat-value">{formatNumber(c.pue, 2)}</div>
        </div>
        <div className="dc-stat">
          <div className="dc-stat-label">Terbarukan</div>
          <div className="dc-stat-value">{formatNumber(c.renew * 100, 0)}<span className="dc-stat-unit">%</span></div>
        </div>
        <div className="dc-stat">
          <div className="dc-stat-label">Hilang oleh rebound</div>
          <div className="dc-stat-value">{formatNumber(c.reboundKwh / 1e6, 1)}<span className="dc-stat-unit">GWh</span></div>
        </div>
      </div>
      <div className="dc-legend">
        <span><i style={{ background: '#287f69' }} />Energi perangkat IT</span>
        <span><i style={{ background: '#5798a2' }} />Tambahan PUE (Power Usage Effectiveness)</span>
        <span><i style={{ background: P.green }} />Terbarukan</span>
        <span><i style={{ background: P.orange }} />Jaringan internet</span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman simulator                                                   */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  modelReduction: 5,
  softwareReduction: 8,
  optimizedPue: 1.38,
  cleanShare: 50,
};

type SceneMode = 'now' | 'demand' | 'combined';

/**
 * Simulasi sensitivitas edukatif, bukan prediksi atau audit energi.
 * Angka awal harus diganti dengan data fasilitas sebenarnya untuk analisis proyek.
 */
export default function Simulator() {
  const { inputs } = useEnergy();

  // Sisi permintaan: pertumbuhan beban, efisiensi, overlap, dan rebound.
  const [workloadGrowth, setWorkloadGrowth] = useState(25);
  const [modelReduction, setModelReduction] = useState(DEFAULTS.modelReduction);
  const [softwareReduction, setSoftwareReduction] = useState(DEFAULTS.softwareReduction);
  const [optimizationOverlap, setOptimizationOverlap] = useState(25);
  const [reboundEffect, setReboundEffect] = useState(20);
  const [optimizedPue, setOptimizedPue] = useState(DEFAULTS.optimizedPue);

  // Sisi pasokan: persentase listrik terbarukan dan asumsi profil produksinya.
  const [cleanShare, setCleanShare] = useState(DEFAULTS.cleanShare);
  const [solarMix, setSolarMix] = useState(60);
  const [temporalMatch, setTemporalMatch] = useState(65);
  const [storageEfficiency, setStorageEfficiency] = useState(85);
  const [renewablePriceRatio, setRenewablePriceRatio] = useState(100);

  const [sceneMode, setSceneMode] = useState<SceneMode>('combined');
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [logMetric, setLogMetric] = useState<LogMetric>('energy');

  // Catatan percobaan: disimpan di browser (localStorage).
  const [log, setLog] = useState<Experiment[]>(loadLog);
  const [note, setNote] = useState('');
  const [logMsg, setLogMsg] = useState('');
  const logTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { saveLog(log); }, [log]);
  useEffect(() => () => {
    if (logTimer.current) clearTimeout(logTimer.current);
  }, []);

  // Animasi: otomatis mati di layar kecil / pengaturan reduced motion, tetapi bisa dinyalakan manual.
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const smallScreen = useMediaQuery('(max-width: 768px)');
  const [animPref, setAnimPref] = useState<'auto' | 'on' | 'off'>('auto');
  const sceneStatic = animPref === 'off' || (animPref === 'auto' && (reducedMotion || smallScreen));

  // Bagian visual yang disorot sebentar ketika slider digeser.
  const [zone, setZone] = useState<ZoneState | null>(null);
  const zoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = (id: Zone, text: string) => {
    setZone({ id, text });
    if (zoneTimer.current) clearTimeout(zoneTimer.current);
    zoneTimer.current = setTimeout(() => setZone(null), 1600);
  };
  useEffect(() => () => {
    if (zoneTimer.current) clearTimeout(zoneTimer.current);
  }, []);

  const current = calculateScenario(
    'Saat ini',
    inputs.itMw,
    inputs.pue,
    inputs.tariff,
    inputs.carbon,
  );

  // Pertumbuhan beban diaplikasikan sebelum efisiensi. Ini membuat perbandingan
  // efisiensi melawan proyeksi masa depan yang setara, bukan hanya keadaan sekarang.
  const demandItMw = inputs.itMw * (1 + workloadGrowth / 100);
  const demandOnly = calculateScenario(
    'Proyeksi tanpa tindakan',
    demandItMw,
    inputs.pue,
    inputs.tariff,
    inputs.carbon,
  );

  // Manfaat optimasi perangkat lunak dikurangi overlap agar dua slider tidak
  // dianggap menghasilkan penghematan yang sepenuhnya terpisah.
  const modelFactor = 1 - modelReduction / 100;
  const effectiveSoftwareSaving = (softwareReduction / 100) * (1 - optimizationOverlap / 100);
  const softwareFactor = 1 - effectiveSoftwareSaving;
  const grossEfficiencyFactor = modelFactor * softwareFactor;
  const grossSavingFraction = 1 - grossEfficiencyFactor;

  // Rebound membatalkan sebagian penghematan teoretis karena layanan yang lebih
  // murah/efisien bisa dipakai lebih banyak. Ini parameter sensitivitas, bukan hukum pasti.
  const netEfficiencyFactor = 1 - grossSavingFraction * (1 - reboundEffect / 100);
  const optimizedItMw = demandItMw * netEfficiencyFactor;

  const efficiencyOnly = calculateScenario(
    'Efisiensi',
    optimizedItMw,
    optimizedPue,
    inputs.tariff,
    inputs.carbon,
  );
  const renewableOnly = calculateScenario(
    'Energi terbarukan',
    demandItMw,
    inputs.pue,
    inputs.tariff,
    inputs.carbon,
    cleanShare / 100,
  );
  const combined = calculateScenario(
    'Gabungan',
    optimizedItMw,
    optimizedPue,
    inputs.tariff,
    inputs.carbon,
    cleanShare / 100,
  );

  // Tarif dasar diturunkan dari hasil fungsi yang sudah digunakan proyek ini,
  // sehingga unit/konvensi tarif yang ada tidak perlu ditebak ulang.
  const gridRate = current.annualKwh > 0
    ? current.annualCost / current.annualKwh
    : inputs.tariff;

  const match = temporalMatch / 100;
  const storageEta = storageEfficiency / 100;
  // Bagian terbarukan yang tidak cocok waktunya diasumsikan bisa digeser dengan
  // penyimpanan. Rugi penyimpanan dimodelkan sederhana lewat efisiensi round-trip.
  const renewableDeliveryEfficiency = match + (1 - match) * storageEta;

  const estimateCost = (annualKwh: number, renewableShare: number) => {
    const deliveredRenewableKwh = annualKwh * renewableShare;
    const gridKwh = Math.max(0, annualKwh - deliveredRenewableKwh);
    const grossRenewableKwh = renewableDeliveryEfficiency > 0
      ? deliveredRenewableKwh / renewableDeliveryEfficiency
      : deliveredRenewableKwh;
    const renewableRate = gridRate * (renewablePriceRatio / 100);
    // Termasuk perkiraan biaya energi untuk produksi bruto terbarukan, tetapi
    // belum termasuk CAPEX, biaya sambungan, pajak, atau tarif daya puncak.
    return gridKwh * gridRate + grossRenewableKwh * renewableRate;
  };

  const currentCost = estimateCost(current.annualKwh, 0);
  const demandCost = estimateCost(demandOnly.annualKwh, 0);
  const efficiencyCost = estimateCost(efficiencyOnly.annualKwh, 0);
  const renewableCost = estimateCost(renewableOnly.annualKwh, cleanShare / 100);
  const combinedCost = estimateCost(combined.annualKwh, cleanShare / 100);

  // Target efisiensi dibandingkan dengan proyeksi tanpa tindakan. Pembelian energi
  // terbarukan sengaja tidak dihitung sebagai pengurangan konsumsi.
  const energyReduction = demandOnly.annualKwh > 0
    ? (1 - efficiencyOnly.annualKwh / demandOnly.annualKwh) * 100
    : 0;
  const emissionsReduction = demandOnly.annualEmissions > 0
    ? (1 - combined.annualEmissions / demandOnly.annualEmissions) * 100
    : 0;
  const success = energyReduction >= 30;

  const combinedRenewableDeliveredKwh = combined.annualKwh * cleanShare / 100;
  const combinedRenewableGeneratedKwh = renewableDeliveryEfficiency > 0
    ? combinedRenewableDeliveredKwh / renewableDeliveryEfficiency
    : combinedRenewableDeliveredKwh;
  const renewableLossKwh = Math.max(0, combinedRenewableGeneratedKwh - combinedRenewableDeliveredKwh);
  const gridSupplyKwh = Math.max(0, combined.annualKwh - combinedRenewableDeliveredKwh);

  // Faktor kapasitas ilustratif, bukan data lokasi. Kapasitas dihitung dari energi
  // bruto yang dibutuhkan, termasuk kerugian akibat penyimpanan/kecocokan waktu.
  const solarShare = solarMix / 100;
  const windShare = 1 - solarShare;
  const solarMw = combinedRenewableGeneratedKwh * solarShare / (8760 * 0.18 * 1000);
  const windMw = combinedRenewableGeneratedKwh * windShare / (8760 * 0.35 * 1000);

  const scenarios = useMemo(() => [
    {
      name: 'Saat ini',
      energy: current.annualKwh / 1e9,
      cost: currentCost / 1e12,
      emissions: current.annualEmissions / 1e6,
    },
    {
      name: 'Tanpa aksi',
      energy: demandOnly.annualKwh / 1e9,
      cost: demandCost / 1e12,
      emissions: demandOnly.annualEmissions / 1e6,
    },
    {
      name: 'Efisiensi',
      energy: efficiencyOnly.annualKwh / 1e9,
      cost: efficiencyCost / 1e12,
      emissions: efficiencyOnly.annualEmissions / 1e6,
    },
    {
      name: 'Terbarukan',
      energy: renewableOnly.annualKwh / 1e9,
      cost: renewableCost / 1e12,
      emissions: renewableOnly.annualEmissions / 1e6,
    },
    {
      name: 'Gabungan',
      energy: combined.annualKwh / 1e9,
      cost: combinedCost / 1e12,
      emissions: combined.annualEmissions / 1e6,
    },
  ], [
    current, currentCost, demandOnly, demandCost, efficiencyOnly, efficiencyCost,
    renewableOnly, renewableCost, combined, combinedCost,
  ]);

  const scenarioRows = [
    { label: 'Saat ini', it: inputs.itMw, pue: inputs.pue, result: current, cost: currentCost },
    { label: 'Proyeksi tanpa tindakan', it: demandItMw, pue: inputs.pue, result: demandOnly, cost: demandCost },
    { label: 'Efisiensi', it: optimizedItMw, pue: optimizedPue, result: efficiencyOnly, cost: efficiencyCost },
    { label: 'Energi terbarukan', it: demandItMw, pue: inputs.pue, result: renewableOnly, cost: renewableCost },
    { label: 'Gabungan', it: optimizedItMw, pue: optimizedPue, result: combined, cost: combinedCost },
  ];

  const growthPercent = current.annualKwh > 0
    ? (demandOnly.annualKwh / current.annualKwh - 1) * 100
    : 0;
  const infrastructureShare = combined.annualKwh > 0
    ? ((combined.annualKwh - optimizedItMw * 8760 * 1000) / combined.annualKwh) * 100
    : 0;

  /* ---------------- Target visual: semua slider masuk ke sini ---------------- */
  const KWH_PER_MW = 8760 * 1000;
  const reboundKwhCombined = demandItMw * grossSavingFraction * (reboundEffect / 100) * optimizedPue * KWH_PER_MW;
  const sceneTarget: SceneTarget = (() => {
    const shared = {
      solar: solarShare,
      match,
      eta: storageEta,
      demandKwh: demandOnly.annualKwh,
      nowKwh: current.annualKwh,
      refKwh: Math.max(demandOnly.annualKwh, current.annualKwh) * 1.05,
      emissionsRef: Math.max(current.annualEmissions, demandOnly.annualEmissions) / 1e6,
    };
    if (sceneMode === 'now') {
      return {
        ...shared,
        itRatio: 1,
        pue: inputs.pue,
        renew: 0,
        totalKwh: current.annualKwh,
        itKwh: inputs.itMw * KWH_PER_MW,
        reboundKwh: 0,
        emissions: current.annualEmissions / 1e6,
      };
    }
    if (sceneMode === 'demand') {
      return {
        ...shared,
        itRatio: inputs.itMw > 0 ? demandItMw / inputs.itMw : 1,
        pue: inputs.pue,
        renew: 0,
        totalKwh: demandOnly.annualKwh,
        itKwh: demandItMw * KWH_PER_MW,
        reboundKwh: 0,
        emissions: demandOnly.annualEmissions / 1e6,
      };
    }
    return {
      ...shared,
      itRatio: inputs.itMw > 0 ? optimizedItMw / inputs.itMw : 1,
      pue: optimizedPue,
      renew: cleanShare / 100,
      totalKwh: combined.annualKwh,
      itKwh: optimizedItMw * KWH_PER_MW,
      reboundKwh: reboundKwhCombined,
      emissions: combined.annualEmissions / 1e6,
    };
  })();

  /* ---------------- Solusi: dampak tiap tindakan secara terpisah ---------------- */
  // Dampak dihitung terhadap "proyeksi tanpa tindakan" yang sama, satu tindakan
  // pada satu waktu. Saat digabung, overlap dan rebound mengurangi total.
  const reboundKeep = 1 - reboundEffect / 100;
  const PRESET_MODEL = 25;
  const PRESET_HARDWARE = 20;
  const PRESET_PUE = clamp(Math.min(1.2, inputs.pue), 1.1, 2);
  const PRESET_CLEAN = 80;

  const reductionVs = (value: number, baseValue: number) =>
    baseValue > 0 ? (1 - value / baseValue) * 100 : 0;

  const solModel = calculateScenario(
    'Model lebih kecil',
    demandItMw * (1 - (PRESET_MODEL / 100) * reboundKeep),
    inputs.pue, inputs.tariff, inputs.carbon,
  );
  const solHardware = calculateScenario(
    'Perangkat keras efisien',
    demandItMw * (1 - (PRESET_HARDWARE / 100) * reboundKeep),
    inputs.pue, inputs.tariff, inputs.carbon,
  );
  const solCooling = calculateScenario(
    'Pendinginan efisien',
    demandItMw, PRESET_PUE, inputs.tariff, inputs.carbon,
  );
  const solRenewable = calculateScenario(
    'Energi terbarukan',
    demandItMw, inputs.pue, inputs.tariff, inputs.carbon, PRESET_CLEAN / 100,
  );

  const solutions = [
    {
      id: 'model',
      title: 'Gunakan model AI yang lebih kecil',
      text: 'Model yang lebih kecil membutuhkan energi lebih sedikit per tugas dibanding model besar. Pilih ukuran model sesuai kebutuhan tugasnya.',
      accent: '#287f69',
      energyCut: reductionVs(solModel.annualKwh, demandOnly.annualKwh),
      emissionCut: reductionVs(solModel.annualEmissions, demandOnly.annualEmissions),
      applied: modelReduction >= PRESET_MODEL,
      preset: `Model −${PRESET_MODEL}% energi per tugas`,
      apply: () => {
        setModelReduction(PRESET_MODEL);
        touch('efficiency', `Model −${PRESET_MODEL}%`);
      },
    },
    {
      id: 'hardware',
      title: 'Optimalkan perangkat keras',
      text: 'Server dan akselerator yang lebih hemat energi bisa menyelesaikan tugas yang sama dengan listrik lebih rendah.',
      accent: '#5798a2',
      energyCut: reductionVs(solHardware.annualKwh, demandOnly.annualKwh),
      emissionCut: reductionVs(solHardware.annualEmissions, demandOnly.annualEmissions),
      applied: softwareReduction >= PRESET_HARDWARE,
      preset: `Perangkat keras dan software −${PRESET_HARDWARE}%`,
      apply: () => {
        setSoftwareReduction(PRESET_HARDWARE);
        touch('efficiency', `Perangkat keras −${PRESET_HARDWARE}%`);
      },
    },
    {
      id: 'cooling',
      title: 'Tingkatkan efisiensi pendinginan',
      text: 'Sistem pendingin yang dirancang baik, pengaturan suhu yang tepat, dan pemantauan energi mengurangi listrik tambahan untuk membuang panas.',
      accent: '#e58b5b',
      energyCut: reductionVs(solCooling.annualKwh, demandOnly.annualKwh),
      emissionCut: reductionVs(solCooling.annualEmissions, demandOnly.annualEmissions),
      applied: optimizedPue <= PRESET_PUE,
      preset: `PUE turun ke ${formatNumber(PRESET_PUE, 2)}`,
      apply: () => {
        setOptimizedPue(PRESET_PUE);
        touch('cooling', `PUE ${formatNumber(PRESET_PUE, 2)}`);
      },
    },
    {
      id: 'renewable',
      title: 'Gunakan energi terbarukan',
      text: 'Listrik dari tenaga surya, angin, dan sumber terbarukan lain menurunkan emisi. Konsumsi kWh tetap sama, hanya sumbernya yang berganti.',
      accent: '#c4a232',
      energyCut: reductionVs(solRenewable.annualKwh, demandOnly.annualKwh),
      emissionCut: reductionVs(solRenewable.annualEmissions, demandOnly.annualEmissions),
      applied: cleanShare >= PRESET_CLEAN,
      preset: `${PRESET_CLEAN}% pasokan terbarukan`,
      apply: () => {
        setCleanShare(PRESET_CLEAN);
        touch('supply', `Terbarukan ${PRESET_CLEAN}%`);
      },
    },
  ];

  const applyAll = () => {
    setModelReduction(PRESET_MODEL);
    setSoftwareReduction(PRESET_HARDWARE);
    setOptimizedPue(PRESET_PUE);
    setCleanShare(PRESET_CLEAN);
    setSceneMode('combined');
    touch('efficiency', 'Semua solusi diterapkan');
  };
  const resetLevers = () => {
    setModelReduction(DEFAULTS.modelReduction);
    setSoftwareReduction(DEFAULTS.softwareReduction);
    setOptimizedPue(DEFAULTS.optimizedPue);
    setCleanShare(DEFAULTS.cleanShare);
    touch('efficiency', 'Disetel ulang');
  };

  const say = (text: string) => {
    setLogMsg(text);
    if (logTimer.current) clearTimeout(logTimer.current);
    logTimer.current = setTimeout(() => setLogMsg(''), 4000);
  };

  const addExperiment = () => {
    if (log.length >= MAX_LOG) {
      say(`Batas ${MAX_LOG} catatan tercapai. Unduh dulu lalu hapus sebagian catatan.`);
      return;
    }
    const entry: Experiment = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toISOString(),
      note: note.trim().slice(0, NOTE_MAX),
      baseItMw: inputs.itMw, basePue: inputs.pue, tariff: inputs.tariff, carbon: inputs.carbon,
      workloadGrowth, modelReduction, softwareReduction, optimizationOverlap,
      reboundEffect, optimizedPue, cleanShare, solarMix,
      temporalMatch, storageEfficiency, renewablePriceRatio,
      optimizedItMw,
      currentTwh: current.annualKwh / 1e9,
      demandTwh: demandOnly.annualKwh / 1e9,
      combinedTwh: combined.annualKwh / 1e9,
      energyReduction,
      costTrillion: combinedCost / 1e12,
      emissionsKt: combined.annualEmissions / 1e6,
      emissionsReduction,
      success,
    };
    setLog((prev) => [...prev, entry]);
    setNote('');
    say(`Tercatat sebagai percobaan #${log.length + 1}.`);
  };

  const deleteExperiment = (id: string) => {
    setLog((prev) => prev.filter((e) => e.id !== id));
    say('Catatan dihapus.');
  };

  const clearLog = () => {
    if (log.length === 0) return;
    if (typeof window !== 'undefined' && !window.confirm(`Hapus semua ${log.length} catatan percobaan? Tindakan ini tidak bisa dibatalkan.`)) return;
    setLog([]);
    say('Semua catatan dihapus.');
  };

  const downloadCsv = (flavor: CsvFlavor) => {
    if (log.length === 0) return;
    const blob = new Blob([buildCsv(log, flavor)], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `percobaan-ai-energy-lab-${flavor === 'id' ? 'excel-id' : 'internasional'}-${fileStamp(new Date())}.csv`);
    say(`CSV diunduh (${log.length} catatan).`);
  };

  const downloadPdf = () => {
    if (log.length === 0) return;
    try {
      const bytes = buildPdf(log, new Date());
      downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }), `laporan-percobaan-ai-energy-lab-${fileStamp(new Date())}.pdf`);
      say(`PDF diunduh (${log.length} catatan).`);
    } catch {
      say('PDF gagal dibuat. Coba lagi atau unduh CSV.');
    }
  };

  const logRows = log.map((e, i) => ({ e, no: i + 1, prev: log[i - 1] })).reverse();
  const metricDef = LOG_METRICS.find((m) => m.id === logMetric) ?? LOG_METRICS[0];

  const modeLabels: Array<{ id: SceneMode; label: string }> = [
    { id: 'now', label: 'Saat ini' },
    { id: 'demand', label: 'Tanpa tindakan' },
    { id: 'combined', label: 'Dengan solusi' },
  ];

  return (
    <div className="page fade-in">
      <style>{SIM_STYLES}</style>

      <header className="page-head">
        <div>
          <div className="eyebrow">RUANG KERJA / 02</div>
          <h1>Simulator solusi energi AI</h1>
          <p>
            Modelkan hubungan antara pertumbuhan beban AI, efisiensi komputasi,
            pendinginan, pasokan terbarukan, biaya energi, dan emisi.
          </p>
        </div>
        <span className="assumption-tag">MODEL SENSITIVITAS</span>
      </header>

      <div className="ws">
        {/* ---------------- Kolom slider ---------------- */}
        <div className="ws-controls">
          <p className="ws-hint">
            Geser slider mana pun. Pusat data bergerak saat itu juga dan bagian
            yang berubah diberi sorotan. Titik warna di tiap slider menunjukkan bagian itu.
          </p>

          <section className="panel">
            <div className="panel-head">
              <h2>Permintaan dan efisiensi</h2>
              <span className="eyebrow">SISI KEBUTUHAN</span>
            </div>
            <p className="field-help" style={{ marginTop: 0, marginBottom: 6 }}>
              Bagian ini menjawab dua hal: seberapa banyak AI dipakai, dan seberapa hemat listrik yang dibutuhkan untuk menjalankannya.
            </p>

            <RangeControl
              label="Seberapa banyak AI dipakai dibanding sekarang"
              shortLabel="Pertumbuhan"
              zone="demand"
              onTouch={touch}
              value={workloadGrowth}
              min={0}
              max={150}
              step={5}
              suffix="%"
              id="workload-growth"
              description="Naik berapa persen pekerjaan yang dikerjakan AI (jumlah pertanyaan, gambar, atau data yang diproses). Contoh: 25% berarti pekerjaannya bertambah seperempat dari sekarang, sehingga kebutuhan listrik ikut naik."
              onChange={setWorkloadGrowth}
            />
            <RangeControl
              label="Hemat listrik karena memakai model AI yang lebih ringan"
              shortLabel="Model"
              zone="efficiency"
              onTouch={touch}
              value={modelReduction}
              min={0}
              max={40}
              step={1}
              suffix="%"
              id="model-reduction"
              description="Model AI yang lebih kecil atau lebih efisien bisa menjawab hal yang sama dengan listrik lebih sedikit. Contoh: 10% berarti tiap jawaban memakai listrik 10% lebih sedikit. Risikonya, pada tugas yang rumit mutu jawaban bisa sedikit turun."
              onChange={setModelReduction}
            />
            <RangeControl
              label="Hemat listrik karena komputer dan program yang lebih hemat"
              shortLabel="Hemat HW/SW"
              zone="efficiency"
              onTouch={touch}
              value={softwareReduction}
              min={0}
              max={30}
              step={1}
              suffix="%"
              id="software-reduction"
              description="Gabungan dari komputer (server dan chip) yang lebih irit listrik dan program yang dibuat lebih rapi, misalnya menyimpan jawaban yang sering ditanyakan agar tidak dihitung ulang. Contoh: 10% berarti listrik untuk pekerjaan yang sama turun 10%."
              onChange={setSoftwareReduction}
            />
            <RangeControl
              label="Penghematan yang saling menimpa"
              shortLabel="Tumpang tindih"
              zone="efficiency"
              onTouch={touch}
              value={optimizationOverlap}
              min={0}
              max={60}
              step={5}
              suffix="%"
              id="optimization-overlap"
              description="Cara hemat model dan cara hemat komputer/program kadang memperbaiki hal yang sama, jadi penghematannya tidak bisa dijumlahkan penuh. Contoh: model hemat 10% dan komputer/program hemat 20%. Jika slider ini 0%, total hemat 28%. Jika 25%, total sekitar 23,5%. Jika 60%, total sekitar 17%. Makin besar angkanya, hitungan makin hati-hati. Kalau ragu, biarkan di 25%."
              onChange={setOptimizationOverlap}
            />
            <RangeControl
              label="Pemakaian bertambah karena AI jadi lebih murah dan cepat"
              shortLabel="Rebound"
              zone="rebound"
              onTouch={touch}
              value={reboundEffect}
              min={0}
              max={80}
              step={5}
              suffix="%"
              id="rebound-effect"
              description="Setelah AI lebih hemat, orang cenderung memakainya lebih sering, sehingga sebagian penghematan 'termakan' lagi. Ini disebut efek pantulan (rebound). Contoh: 20% berarti seperlima dari penghematan hilang. Angka ini asumsi, bukan angka pasti."
              onChange={setReboundEffect}
            />
            <RangeControl
              label="Efisiensi gedung pusat data (PUE)"
              shortLabel="PUE"
              zone="cooling"
              onTouch={touch}
              value={optimizedPue}
              min={1.1}
              max={2}
              step={0.01}
              suffix=""
              id="optimized-pue"
              description="PUE membandingkan listrik seluruh gedung dengan listrik yang dipakai komputer saja. PUE 1,0 berarti semua listrik dipakai komputer. PUE 1,5 berarti setiap 1 unit listrik komputer butuh tambahan 0,5 unit untuk pendingin dan keperluan gedung lain. Makin kecil makin hemat."
              onChange={setOptimizedPue}
            />
          </section>

          <section className="panel" style={{ marginTop: 15 }}>
            <div className="panel-head">
              <h2>Pasokan terbarukan dan penyimpanan</h2>
              <span className="assumption-tag">SISI PASOKAN</span>
            </div>
            <RangeControl
              label="Berapa persen listrik berasal dari surya dan angin"
              shortLabel="Terbarukan"
              zone="supply"
              onTouch={touch}
              value={cleanShare}
              min={0}
              max={100}
              step={5}
              suffix="%"
              id="clean-share"
              description="Bagian kebutuhan listrik yang dipasok sumber terbarukan; sisanya dari Jaringan internet biasa. Ini menurunkan emisi, tetapi tidak mengurangi jumlah listrik yang dipakai."
              onChange={setCleanShare}
            />
            <RangeControl
              label="Dari listrik terbarukan itu, berapa persen dari surya"
              shortLabel="Surya"
              zone="supply"
              onTouch={touch}
              value={solarMix}
              min={0}
              max={100}
              step={5}
              suffix="%"
              id="solar-mix"
              description={`Sisanya (${formatNumber(100 - solarMix, 0)}%) dianggap dari angin. Faktor kapasitas diasumsikan surya 18% dan angin 35%, artinya panel surya rata-rata hanya menghasilkan 18% dari kemampuan maksimalnya sepanjang tahun.`}
              onChange={setSolarMix}
            />
            <RangeControl
              label="Seberapa pas waktu produksi dengan waktu pemakaian"
              shortLabel="Kecocokan"
              zone="storage"
              onTouch={touch}
              value={temporalMatch}
              min={20}
              max={100}
              step={5}
              suffix="%"
              id="temporal-match"
              description="Surya hanya menghasilkan listrik di siang hari, sedangkan pusat data bekerja 24 jam. Angka ini adalah bagian listrik terbarukan yang langsung terpakai saat dihasilkan. Sisanya harus disimpan dulu di baterai."
              onChange={setTemporalMatch}
            />
            <RangeControl
              label="Efisiensi baterai (listrik yang kembali dari yang disimpan)"
              shortLabel="Baterai"
              zone="storage"
              onTouch={touch}
              value={storageEfficiency}
              min={60}
              max={98}
              step={1}
              suffix="%"
              id="storage-efficiency"
              description="Kalau 100 kWh disimpan di baterai, hanya sebagian yang bisa dipakai lagi. Contoh: 85% berarti 15 kWh hilang, sehingga pembangkit perlu menghasilkan lebih banyak."
              onChange={setStorageEfficiency}
            />
            <RangeControl
              label="Harga listrik terbarukan dibanding tarif jaringan"
              shortLabel="Harga"
              zone="cost"
              onTouch={touch}
              value={renewablePriceRatio}
              min={60}
              max={160}
              step={5}
              suffix="%"
              id="renewable-price-ratio"
              description="100% berarti harganya sama dengan tarif listrik biasa di model. Di bawah 100% lebih murah, di atas 100% lebih mahal. Sesuaikan jika kamu punya data kontrak."
              onChange={setRenewablePriceRatio}
            />

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">ESTIMASI KAPASITAS SURYA</div>
                <div className="metric-value">{formatNumber(solarMw, 1)} MW</div>
                <div className="metric-unit">Faktor kapasitas 18%</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">ESTIMASI KAPASITAS ANGIN</div>
                <div className="metric-value">{formatNumber(windMw, 1)} MW</div>
                <div className="metric-unit">Faktor kapasitas 35%</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">PASOKAN JARINGAN TERSISA</div>
                <div className="metric-value">{formatNumber(gridSupplyKwh / 1e9, 3)} TWh</div>
                <div className="metric-unit">Setelah pasokan terbarukan yang dimodelkan</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">ENERGI BRUTO TAMBAHAN</div>
                <div className="metric-value">{formatNumber(renewableLossKwh / 1e6, 1)} GWh</div>
                <div className="metric-unit">Perkiraan rugi/selisih penyimpanan</div>
              </div>
            </div>
            <p className="scenario-note">
              Kapasitas dihitung dari energi bruto yang dibutuhkan ÷ (8.760 jam × faktor kapasitas).
              Model tidak melakukan simulasi per jam, tidak membatasi kapasitas/daya baterai, dan tidak
              menghitung curtailment secara terpisah. Karena itu angka kapasitas bukan desain teknis.
            </p>
          </section>
        </div>

        {/* ---------------- Visual hidup (menempel saat scroll) ---------------- */}
        <div className="ws-stage">
          <section className="dc-scene-card" data-testid="data-center-scene">
            <div className="dc-scene-top">
              <div>
                <h2>Pusat data langsung</h2>
                <p>Menara di kanan: tinggi = listrik per tahun. Garis putus-putus = proyeksi tanpa tindakan.</p>
              </div>
              <div className="dc-controls">
              <div className="dc-modes" role="group" aria-label="Pilih tampilan 2D atau 3D">
                {(['2d', '3d'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} data-testid={`button-view-${v}`}>
                    {v === '2d' ? '2D' : '3D'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="dc-anim"
                aria-pressed={!sceneStatic}
                onClick={() => setAnimPref(sceneStatic ? 'on' : 'off')}
                title={sceneStatic && (reducedMotion || smallScreen) && animPref === 'auto'
                  ? 'Animasi dimatikan otomatis (layar kecil atau pengaturan perangkat)'
                  : undefined}
              >
                {sceneStatic ? '▶ Nyalakan animasi' : '❚❚ Matikan animasi'}
              </button>
              <div className="dc-modes" role="group" aria-label="Pilih keadaan yang ditampilkan">
                {modeLabels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={sceneMode === m.id}
                    onClick={() => setSceneMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              </div>
            </div>

            <DataCenterScene target={sceneTarget} zone={zone} staticMode={sceneStatic} small={smallScreen} view={view} />

            <div className={`dc-goal ${success ? 'dc-goal-ok' : ''}`} data-testid="challenge-status">
              <div className="dc-goal-top">
                <span>TANTANGAN EFISIENSI</span>
                <span>TARGET −30%</span>
              </div>
              <h3>{success ? 'Target tercapai pada proyeksi ini.' : 'Target belum tercapai pada proyeksi ini.'}</h3>
              <div className="dc-goal-track">
                <div
                  className="dc-goal-fill"
                  style={{ width: `${clamp(energyReduction / 30 * 100, 0, 100)}%`, transition: 'width .35s ease-out' }}
                />
              </div>
              <p>
                Konsumsi fasilitas turun <strong>{formatNumber(energyReduction, 1)}%</strong>
                {' '}dibanding proyeksi tanpa tindakan. Beban IT hasil optimasi:{' '}
                <strong>{formatNumber(optimizedItMw, 2)} MW</strong>. Energi terbarukan tidak dihitung
                sebagai pengurangan konsumsi: ia menurunkan emisi, bukan jumlah kWh.
              </p>
              <div className="dc-log-row">
                <button type="button" className="dc-anim" onClick={addExperiment} data-testid="button-log-scene">
                  ＋ Catat percobaan ini
                </button>
                <span>
                  <a
                    href="#catatan-percobaan"
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById('catatan-percobaan')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
                    }}
                  >
                    {log.length} tercatat
                  </a>
                  {logMsg ? ` · ${logMsg}` : ''}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---------------- Perbandingan ---------------- */}
      <section className="panel" style={{ marginTop: 15 }}>
        <div className="panel-head">
          <h2>Lima keadaan yang dibandingkan</h2>
        </div>
        <div className="scenario-table-wrap">
          <table className="scenario-table" data-testid="scenario-comparison-table">
            <thead>
              <tr>
                <th>Skenario</th>
                <th>IT / PUE</th>
                <th>Listrik / tahun</th>
                <th>Biaya energi / tahun</th>
                <th>Emisi operasional / tahun</th>
              </tr>
            </thead>
            <tbody>
              {scenarioRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{formatNumber(row.it, 2)} MW / {formatNumber(row.pue, 2)}</td>
                  <td>{formatNumber(row.result.annualKwh / 1e9, 3)} TWh</td>
                  <td>{formatRupiah(row.cost)}</td>
                  <td>{formatNumber(row.result.annualEmissions / 1e6, 2)} kt CO₂e</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="scenario-note">
          “Proyeksi tanpa tindakan” menerapkan pertumbuhan beban, tetapi belum menerapkan optimasi.
          “Efisiensi” memakai pertumbuhan yang sama ditambah efisiensi komputasi dan PUE baru.
          “Energi terbarukan” memakai beban yang tumbuh tanpa efisiensi. “Gabungan” menggabungkan
          efisiensi dan energi terbarukan. Dengan ini, efek masing-masing tindakan dapat dibandingkan
          dengan dasar yang setara.
        </p>

        <div className="ws-lower-grid">
          <MiniChart title="Konsumsi listrik tahunan" dataKey="energy" unit="TWh" data={scenarios} color="#287f69" />
          <MiniChart title="Estimasi biaya energi tahunan" dataKey="cost" unit="Rp triliun" data={scenarios} color="#e58b5b" />
          <MiniChart title="Emisi operasional dari listrik" dataKey="emissions" unit="kt CO₂e" data={scenarios} color="#5798a2" />
        </div>
      </section>

      {/* ---------------- Catatan percobaan ---------------- */}
      <section className="panel" style={{ marginTop: 15 }} id="catatan-percobaan" data-testid="experiment-log">
        <div className="panel-head">
          <h2>Catatan percobaan</h2>
          <span className="eyebrow">{log.length} TERCATAT</span>
        </div>
        <p className="field-help" style={{ marginTop: 0, marginBottom: 14 }}>
          Atur slider sampai hasilnya menarik, lalu tekan “Catat percobaan ini”. Setiap catatan menyimpan
          pengaturan slider dan hasilnya pada saat itu, lalu dibandingkan dengan percobaan sebelumnya.
          Catatan tersimpan di browser ini, bisa dihapus, dan bisa diunduh sebagai CSV atau PDF.
        </p>

        <div className="log-note-wrap">
          <textarea
            className="log-input log-textarea"
            rows={2}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                addExperiment();
              }
            }}
            placeholder="Catatan (opsional), misalnya: PUE 1,2 dan terbarukan 80%. Boleh panjang. Ctrl + Enter untuk mencatat."
            aria-label="Catatan untuk percobaan ini"
            data-testid="input-log-note"
          />
          <div className="log-count" aria-hidden="true">{note.length}/{NOTE_MAX}</div>
        </div>
        <div className="log-actions">
          <button type="button" className="sol-btn sol-btn-primary" onClick={addExperiment} data-testid="button-log-add">
            ＋ Catat percobaan ini
          </button>
          <DownloadMenu
            disabled={log.length === 0}
            onCsvId={() => downloadCsv('id')}
            onCsvIntl={() => downloadCsv('intl')}
            onPdf={downloadPdf}
          />
          <button type="button" className="sol-btn" onClick={clearLog} disabled={log.length === 0} data-testid="button-log-clear">
            Hapus semua
          </button>
        </div>
        <p className="log-status" role="status" aria-live="polite">{logMsg}</p>

        {log.length === 0 ? (
          <div className="log-empty">
            Belum ada catatan. Coba geser slider, misalnya naikkan porsi terbarukan atau turunkan PUE,
            lalu tekan “Catat percobaan ini” untuk menyimpan hasilnya.
          </div>
        ) : (
          <>
            <CompareCards list={log} />

            <div className="log-chart-head">
              <span className="metric-label">GRAFIK PERBANDINGAN ANTAR PERCOBAAN</span>
              <div className="log-tabs" role="group" aria-label="Pilih data pada grafik">
                {LOG_METRICS.map((m) => (
                  <button key={m.id} type="button" aria-pressed={logMetric === m.id} onClick={() => setLogMetric(m.id)} data-testid={`button-log-metric-${m.id}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {log.length >= 2 ? (
              <LogChart list={log} metric={metricDef} />
            ) : (
              <div className="log-empty" style={{ marginTop: 12 }}>Grafik muncul setelah ada minimal 2 percobaan.</div>
            )}
            <p className="scenario-note" style={{ marginTop: 6 }}>
              Batang pekat = percobaan terbaru, batang agak pudar = percobaan sebelumnya, batang paling pudar = percobaan lama.
              {log.length > CHART_MAX ? ` Grafik menampilkan ${CHART_MAX} percobaan terakhir; tabel dan unduhan memuat semuanya.` : ''}
            </p>

            <div className="scenario-table-wrap" style={{ marginTop: 14 }}>
              <table className="scenario-table log-table" data-testid="experiment-log-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Waktu</th>
                    <th className="log-note">Catatan</th>
                    <th>AI naik</th>
                    <th>PUE baru</th>
                    <th>Terbarukan</th>
                    <th>Listrik</th>
                    <th>Emisi</th>
                    <th>Hemat listrik</th>
                    <th>Listrik vs sebelumnya</th>
                    <th>Target −30%</th>
                    <th><span className="sr-only">Hapus</span></th>
                  </tr>
                </thead>
                <tbody>
                  {logRows.map(({ e, no, prev }) => {
                    const pc = prev ? pctChange(e.combinedTwh, prev.combinedTwh) : null;
                    return (
                      <tr key={e.id}>
                        <td>{no}</td>
                        <td>{formatTime(e.time)}</td>
                        <td className="log-note">{e.note || '—'}</td>
                        <td>{formatNumber(e.workloadGrowth, 0)}%</td>
                        <td>{formatNumber(e.optimizedPue, 2)}</td>
                        <td>{formatNumber(e.cleanShare, 0)}%</td>
                        <td>{formatNumber(e.combinedTwh, 3)} TWh</td>
                        <td>{formatNumber(e.emissionsKt, 1)} kt CO₂e</td>
                        <td>{formatNumber(e.energyReduction, 1)}%</td>
                        <td className={pc === null ? '' : pc < 0 ? 'log-good' : pc > 0 ? 'log-bad' : ''}>
                          {pc === null ? '—' : `${pc < 0 ? '▼' : pc > 0 ? '▲' : '＝'} ${signedNumber(pc, 1)}%`}
                        </td>
                        <td>{e.success ? 'Tercapai' : 'Belum'}</td>
                        <td>
                          <button
                            type="button"
                            className="sol-btn log-del"
                            onClick={() => deleteExperiment(e.id)}
                            aria-label={`Hapus catatan nomor ${no}`}
                            data-testid={`button-log-delete-${no}`}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="scenario-note">
          Hasil yang dicatat adalah skenario “Gabungan” (efisiensi dan energi terbarukan sekaligus), dibandingkan
          dengan proyeksi tanpa tindakan. Pilih “CSV untuk Excel (Indonesia)” bila Excel di komputermu memakai koma
          sebagai tanda desimal; pilih CSV internasional untuk Google Sheets. Catatan hanya tersimpan di browser dan
          perangkat ini, jadi unduh secara berkala bila datanya penting.
        </p>
      </section>

      {/* ---------------- Rantai sebab dan akibat ---------------- */}
      <section className="panel" style={{ marginTop: 15 }}>
        <div className="panel-head">
          <h2>Rantai sebab dan akibat</h2>
        </div>
        <ol style={{ paddingLeft: 20, display: 'grid', gap: 12, lineHeight: 1.55 }}>
          <li>
            <strong>Penggunaan AI bertambah.</strong> Pertumbuhan {formatNumber(workloadGrowth, 0)}%
            {' '}menaikkan beban IT dari {formatNumber(inputs.itMw, 2)} MW menjadi sekitar
            {' '}{formatNumber(demandItMw, 2)} MW sebelum optimasi. Dengan PUE tetap,
            kenaikan beban IT juga menaikkan energi fasilitas. Pada model ini, dampaknya terhadap
            konsumsi tahunan adalah {formatNumber(growthPercent, 1)}% dibanding kondisi saat ini.
          </li>
          <li>
            <strong>Optimasi mengurangi energi per tugas.</strong> Model memberi pengurangan
            {' '}{formatNumber(modelReduction, 0)}%; optimasi software memberi penghematan efektif
            {' '}{formatNumber(effectiveSoftwareSaving * 100, 1)}% setelah memperhitungkan overlap
            {` ${formatNumber(optimizationOverlap, 0)}%`}. Penghematan teoretis gabungan menjadi
            {' '}{formatNumber(grossSavingFraction * 100, 1)}% sebelum efek pantulan.
          </li>
          <li>
            <strong>Efek pantulan mengurangi manfaat bersih.</strong> Dengan rebound
            {' '}{formatNumber(reboundEffect, 0)}%, sebagian penghematan dipakai kembali oleh
            peningkatan aktivitas. Faktor beban IT setelah rebound menjadi
            {' '}{formatNumber(netEfficiencyFactor * 100, 1)}% dari proyeksi tanpa optimasi.
          </li>
          <li>
            <strong>PUE mengubah energi di luar perangkat IT.</strong> Dalam skenario gabungan,
            energi fasilitas adalah {formatNumber(combined.annualKwh / 1e9, 3)} TWh/tahun;
            sekitar {formatNumber(infrastructureShare, 1)}% dipakai di luar perangkat IT menurut
            rumus PUE model. Menurunkan PUE mengurangi tambahan untuk pendinginan dan sistem pendukung,
            tetapi PUE aktual juga dipengaruhi desain, beban, dan kondisi iklim.
          </li>
          <li>
            <strong>Energi terbarukan mengganti sumber, bukan menghapus kebutuhan.</strong> Pada porsi
            {' '}{formatNumber(cleanShare, 0)}%, model memasok sekitar
            {' '}{formatNumber(combinedRenewableDeliveredKwh / 1e9, 3)} TWh kebutuhan tahunan dari
            sumber terbarukan dan menyisakan {formatNumber(gridSupplyKwh / 1e9, 3)} TWh dari jaringan.
            Estimasi emisi operasional gabungan turun {formatNumber(emissionsReduction, 1)}% dibanding
            proyeksi tanpa tindakan, dengan asumsi emisi operasional terbarukan nol.
          </li>
          <li>
            <strong>Ketidakcocokan waktu punya konsekuensi.</strong> Kecocokan langsung
            {' '}{formatNumber(temporalMatch, 0)}% dan efisiensi penyimpanan
            {' '}{formatNumber(storageEfficiency, 0)}% membuat kapasitas pembangkit yang dibutuhkan
            lebih besar daripada sekadar membagi kebutuhan dengan faktor kapasitas. Estimasi energi
            bruto di atas energi yang sampai ke beban adalah {formatNumber(renewableLossKwh / 1e6, 1)} GWh/tahun.
          </li>
        </ol>
        <div className="scenario-note" style={{ marginTop: 12 }}>
          <strong>Catatan keterbatasan:</strong> Ini simulasi sensitivitas, bukan prediksi presisi.
          Model menganggap hubungan beban dan energi kira-kira linear, memakai faktor kapasitas surya/angin
          tetap, dan tidak memodelkan data per jam, suhu/cuaca, batas kapasitas jaringan, reliabilitas,
          degradasi baterai, emisi daur hidup, investasi awal (CAPEX), pajak, atau tarif daya puncak.
          Emisi terbarukan dihitung nol pada operasi, bukan nol sepanjang daur hidup. Hasil nyata memerlukan
          data beban, PUE, tarif, faktor emisi jaringan, profil pembangkit, dan biaya fasilitas yang terukur.
        </div>
      </section>

      {/* ---------------- Solusi mengurangi dampak ---------------- */}
      <section className="panel" style={{ marginTop: 15 }} data-testid="solutions-panel">
        <div className="sol-head">
          <div>
            <h2 style={{ margin: 0 }}>Cara mengurangi dampak listrik AI</h2>
            <p className="field-help" style={{ margin: '4px 0 0' }}>
              Tiap kartu menunjukkan dampak satu tindakan terhadap proyeksi tanpa tindakan.
              Tekan “Coba di simulator” lalu lihat pusat data di atas berubah.
            </p>
          </div>
          <div className="sol-actions">
            <button type="button" className="sol-btn sol-btn-primary" onClick={applyAll}>
              Terapkan semua
            </button>
            <button type="button" className="sol-btn" onClick={resetLevers}>
              Setel ulang
            </button>
          </div>
        </div>

        <div className="sol-grid">
          {solutions.map((s) => (
            <article
              key={s.id}
              className="sol-card"
              data-applied={s.applied}
              style={{ '--accent': s.accent } as CSSProperties}
            >
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <div className="sol-meter">
                <div className="sol-meter-row">
                  <span>Listrik</span>
                  <div className="sol-track">
                    <div className="sol-fill" style={{ width: `${clamp(s.energyCut / 40 * 100, 0, 100)}%` }} />
                  </div>
                  <span className="sol-num">−{formatNumber(Math.max(0, s.energyCut), 1)}%</span>
                </div>
                <div className="sol-meter-row">
                  <span>Emisi</span>
                  <div className="sol-track">
                    <div className="sol-fill" style={{ width: `${clamp(s.emissionCut / 40 * 100, 0, 100)}%` }} />
                  </div>
                  <span className="sol-num">−{formatNumber(Math.max(0, s.emissionCut), 1)}%</span>
                </div>
              </div>
              <div className="field-help">{s.preset}</div>
              {s.applied ? (
                <span className="sol-badge">Sudah diterapkan di slider</span>
              ) : (
                <button type="button" className="sol-btn" onClick={s.apply}>
                  Coba di simulator
                </button>
              )}
            </article>
          ))}
        </div>

        <p className="scenario-note" style={{ marginTop: 14 }}>
          Dampak dihitung satu per satu terhadap dasar yang sama, dengan rebound {formatNumber(reboundEffect, 0)}%.
          Bila digabung, tumpang tindih manfaat dan rebound membuat total tidak sama dengan penjumlahan angka
          di tiap kartu. Energi terbarukan menurunkan emisi, tetapi tidak mengurangi kWh yang dipakai.
          Angka ini ilustrasi sensitivitas, bukan janji hasil.
        </p>
      </section>
    </div>
  );
}