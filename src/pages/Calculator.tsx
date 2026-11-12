import { useState } from 'react';
import { BookOpen, Calculator as CalculatorIcon, HelpCircle, Info, Lightbulb } from 'lucide-react';
import { calculateScenario, formatNumber, formatRupiah } from '../lib/energy';
import { useEnergy } from '../lib/EnergyContext';

type GlossaryItem = { id: string; term: string; meaning: string; example?: string };

const GLOSSARY: GlossaryItem[] = [
  {
    id: 'daya-it',
    term: 'Daya IT / komputasi',
    meaning: 'Listrik yang dipakai peralatan yang benar-benar bekerja: server, chip AI (GPU), dan perangkat jaringan data. Belum termasuk pendingin ruangan atau lampu gedung.',
    example: 'Mirip listrik yang dipakai laptop saat dinyalakan, tanpa menghitung AC ruangannya.',
  },
  {
    id: 'mw',
    term: 'MW (megawatt)',
    meaning: 'Satuan daya: seberapa besar listrik yang dipakai pada satu saat. 1 MW = 1.000 kW = 1 juta watt.',
    example: 'Lampu LED rumah sekitar 10 watt, jadi 1 MW setara 100.000 lampu yang menyala bersamaan.',
  },
  {
    id: 'pue',
    term: 'PUE',
    meaning: 'Singkatan dari Power Usage Effectiveness. Angka yang menunjukkan seberapa besar listrik tambahan untuk pendingin, lampu, dan sistem pendukung, di luar peralatan IT. Nilai terkecil adalah 1,0 (tanpa listrik tambahan); makin kecil makin hemat.',
    example: 'PUE 1,4 artinya setiap 1 unit listrik untuk komputer, gedung memakai 1,4 unit. Sisa 0,4 unit dipakai pendingin dan sistem pendukung.',
  },
  {
    id: 'daya-fasilitas',
    term: 'Daya fasilitas',
    meaning: 'Total daya seluruh gedung, yaitu daya IT dikali PUE.',
    example: '10 MW × PUE 1,4 = 14 MW.',
  },
  {
    id: 'kwh',
    term: 'kWh (kilowatt-jam)',
    meaning: 'Satuan energi: jumlah listrik yang terpakai selama waktu tertentu. Inilah satuan yang tertulis di tagihan listrik. 1 kWh = alat berdaya 1.000 watt yang menyala selama 1 jam.',
    example: 'Setrika 1.000 watt yang dipakai 1 jam memakai 1 kWh.',
  },
  {
    id: 'gwh-twh',
    term: 'GWh dan TWh',
    meaning: 'Versi besar dari kWh supaya angkanya tidak terlalu panjang. 1 GWh = 1 juta kWh. 1 TWh = 1 miliar kWh = 1.000 GWh.',
  },
  {
    id: 'tarif',
    term: 'Tarif listrik (IDR/kWh)',
    meaning: 'Harga listrik per 1 kWh, dalam rupiah. Di kalkulator ini nilainya hanya asumsi, bukan tarif atau tagihan sebenarnya di suatu lokasi.',
    example: 'Rp1.500/kWh berarti setiap 1 kWh yang dipakai dibayar Rp1.500.',
  },
  {
    id: 'faktor-karbon',
    term: 'Faktor karbon jaringan',
    meaning: 'Banyaknya gas rumah kaca yang dilepas pembangkit listrik untuk menghasilkan 1 kWh. Makin banyak listrik berasal dari batu bara, angkanya makin tinggi; makin banyak dari surya, air, atau angin, makin rendah.',
    example: '0,45 kg CO₂e/kWh berarti setiap 1 kWh yang dipakai "menyumbang" 0,45 kg emisi.',
  },
  {
    id: 'co2e',
    term: 'CO₂e (karbon dioksida ekuivalen)',
    meaning: 'Cara menyatukan berbagai gas rumah kaca (CO₂, metana, dan lainnya) ke dalam satu ukuran, yaitu setara berapa kilogram CO₂.',
  },
  {
    id: 'mt',
    term: 'Mt CO₂e (megaton)',
    meaning: 'Satuan emisi untuk jumlah yang sangat besar. 1 Mt = 1 juta ton = 1 miliar kg CO₂e.',
  },
  {
    id: 'emisi-operasional',
    term: 'Emisi operasional',
    meaning: 'Emisi dari listrik yang dipakai fasilitas saat beroperasi. Tidak termasuk emisi dari pembuatan server atau pembangunan gedung (disebut emisi daur hidup).',
  },
  {
    id: 'jaringan',
    term: 'Jaringan listrik (grid)',
    meaning: 'Sistem pembangkit, kabel transmisi, dan gardu yang menyalurkan listrik ke fasilitas.',
  },
  {
    id: 'asumsi',
    term: 'Asumsi editabel dan model ilustratif',
    meaning: 'Nilai-nilai di kalkulator adalah perkiraan awal yang boleh Anda ubah. Hasilnya berguna untuk memahami skala dan cara menghitung, bukan data nyata dari fasilitas tertentu.',
  },
];

const STEPS = [
  { title: 'Tentukan ukuran fasilitas', body: 'Isi "Daya IT / komputasi" dengan seberapa besar listrik yang dipakai komputernya, dalam MW. Semakin besar fasilitas, semakin besar angkanya.' },
  { title: 'Isi PUE', body: 'PUE menunjukkan seberapa boros pendinginannya. Belum tahu? Biarkan di 1,4, nilai yang masuk akal untuk contoh.' },
  { title: 'Isi tarif dan faktor karbon', body: 'Tarif menentukan biaya listrik, faktor karbon menentukan emisinya. Belum tahu? Pakai nilai awal dulu.' },
  { title: 'Baca hasilnya', body: 'Hasil di sebelah kanan berubah seketika saat Anda mengetik. Tidak ada tombol "hitung". Coba ubah satu angka saja dan lihat apa yang bergeser.' },
];

const STYLES = `
.guide-panel { margin-bottom: 20px; }
.guide-panel > summary { cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1.05rem; padding: 14px 18px; list-style: none; }
.guide-panel > summary::-webkit-details-marker { display: none; }
.guide-panel > summary:focus-visible, .explain-btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 6px; }
.guide-body { padding: 0 18px 18px; }
.guide-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; counter-reset: step; }
.guide-steps li { counter-increment: step; border: 1px solid rgba(128,128,128,.3); border-radius: 10px; padding: 12px 14px; background: rgba(128,128,128,.07); }
.guide-steps li::before { content: counter(step); display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: 1px solid currentColor; font-size: .8rem; font-weight: 600; margin-bottom: 8px; }
.guide-steps strong { display: block; margin-bottom: 4px; }
.guide-steps p { margin: 0; font-size: .9rem; line-height: 1.5; opacity: .85; }
.guide-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 14px; }
.guide-btn { cursor: pointer; font: inherit; color: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid currentColor; background: transparent; }
.guide-btn:hover { background: rgba(128,128,128,.15); }
.guide-btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.guide-hint { font-size: .85rem; opacity: .8; }
.plain-help { margin-top: 6px; font-size: .85rem; line-height: 1.5; }
.explain-btn { cursor: pointer; font: inherit; font-size: .8rem; color: inherit; background: none; border: none; padding: 0; margin-top: 6px; display: inline-flex; align-items: center; gap: 5px; text-decoration: underline; text-underline-offset: 3px; opacity: .85; }
.explain-btn:hover { opacity: 1; }
.plain-summary { border-left: 3px solid currentColor; padding: 10px 14px; margin: 16px 0 0; background: rgba(128,128,128,.07); border-radius: 0 8px 8px 0; line-height: 1.6; font-size: .95rem; }
.plain-summary strong { display: block; margin-bottom: 4px; }
.units-note { margin-top: 12px; font-size: .85rem; line-height: 1.6; opacity: .85; }
.glossary-panel { margin-top: 20px; }
.glossary-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin: 0; }
.glossary-item { border: 1px solid rgba(128,128,128,.3); border-radius: 10px; padding: 12px 14px; scroll-margin-top: 80px; }
.glossary-item.is-active { background: rgba(56,140,248,.16); border-color: rgba(56,140,248,.7); }
.glossary-item dt { font-weight: 600; margin-bottom: 4px; }
.glossary-item dd { margin: 0; font-size: .9rem; line-height: 1.55; }
.glossary-item dd + dd { margin-top: 6px; opacity: .8; }

/* Cegah angka hasil yang panjang melewati kartu, terutama di layar Android. */
.metrics-grid,
.metric-card {
  min-width: 0;
  max-width: 100%;
}
.metric-card {
  overflow: hidden;
}
.metric-value {
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-variant-numeric: tabular-nums;
}
.metric-card[data-testid="result-annual-cost"] .metric-value {
  font-size: clamp(1rem, 4vw, 1.6rem);
  line-height: 1.25;
}
@media (max-width: 480px) {
  .metric-card[data-testid="result-annual-cost"] .metric-value {
    font-size: clamp(.9rem, 4.2vw, 1.15rem);
    letter-spacing: -0.025em;
  }
}
`;

function EditableField({ label, value, unit, help, plain, termId, testId, min, max, step, onChange, onExplain }: { label: string; value: number; unit: string; help: string; plain: string; termId: string; testId: string; min: number; max: number; step: number; onChange: (value: number) => void; onExplain: (termId: string) => void }) {
  return (
    <div className="field">
      <div className="field-label"><span>{label}</span><span className="assumption-tag">ASUMSI EDITABEL</span></div>
      <div className="input-wrap">
        <input aria-label={label} type="number" value={value} min={min} max={max} step={step} data-testid={testId} onChange={(event) => onChange(Number(event.target.value))} />
        <span className="input-unit">{unit}</span>
      </div>
      <div className="plain-help"><strong>Artinya: </strong>{plain}</div>
      <div className="field-help">{help}</div>
      <button type="button" className="explain-btn" onClick={() => onExplain(termId)} aria-label={`Lihat arti ${label} di kamus istilah`}>
        <HelpCircle size={13} /> Lihat di kamus istilah
      </button>
    </div>
  );
}

export default function Calculator() {
  const { inputs, update } = useEnergy();
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const result = calculateScenario('Dasar', inputs.itMw, inputs.pue, inputs.tariff, inputs.carbon);
  const dailyKwh = result.facilityMw * 24 * 1000;

  const openTerm = (id: string) => {
    setActiveTerm(id);
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`istilah-${id}`)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    window.setTimeout(() => setActiveTerm((current) => (current === id ? null : current)), 3500);
  };

  const useExample = () => {
    update('itMw', 10);
    update('pue', 1.4);
    update('tariff', 1500);
    update('carbon', 0.45);
  };

  return (
    <div className="page fade-in">
      <style>{STYLES}</style>
      <header className="page-head">
        <div><div className="eyebrow">RUANG KERJA / 01</div><h1>Kalkulator energi</h1><p>Bangun estimasi fasilitas Anda sendiri. Semua nilai input dapat diubah; hasil akan dihitung ulang seketika.</p></div>
        <span className="assumption-tag"><Info size={12} style={{ marginRight: 5 }} /> MODEL ILUSTRATIF</span>
      </header>

      <details className="panel guide-panel" open>
        <summary><BookOpen size={18} /> Cara memakai kalkulator ini</summary>
        <div className="guide-body">
          <p style={{ marginTop: 0 }}>Kalkulator ini memperkirakan berapa listrik, biaya, dan emisi karbon yang dihabiskan sebuah pusat data (tempat komputer AI bekerja) dalam setahun. Anda tidak perlu paham istilahnya dulu; ikuti empat langkah ini.</p>
          <ol className="guide-steps">
            {STEPS.map((step) => (
              <li key={step.title}><strong>{step.title}</strong><p>{step.body}</p></li>
            ))}
          </ol>
          <div className="guide-actions">
            <button type="button" className="guide-btn" onClick={useExample}>Isi dengan contoh (10 MW)</button>
            <span className="guide-hint"><Lightbulb size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Bingung dengan sebuah istilah? Tekan "Lihat di kamus istilah" di bawah tiap kolom, atau buka kamus di bagian bawah halaman.</span>
          </div>
        </div>
      </details>

      <div className="calculator-grid">
        <section className="panel">
          <div className="panel-head"><h2><CalculatorIcon size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Parameter model</h2></div>
          <EditableField label="Daya IT / komputasi" value={inputs.itMw} unit="MW" plain="Seberapa besar listrik yang dipakai komputer dan server saja. Makin besar fasilitas, makin besar angkanya." termId="daya-it" help="Setting skenario, bukan pengukuran fasilitas tertentu. Rentang 0,1–500 MW." testId="input-it-mw" min={0.1} max={500} step={0.1} onChange={(value) => update('itMw', Math.min(500, Math.max(.1, value || .1)))} onExplain={openTerm} />
          <EditableField label="PUE" value={inputs.pue} unit="rasio" plain="Seberapa boros gedungnya di luar komputer, misalnya untuk pendingin. Angka 1,0 paling hemat; makin tinggi makin boros." termId="pue" help="Asumsi model 1,4. PUE = energi fasilitas ÷ energi peralatan IT; nilai lebih rendah berarti overhead lebih kecil." testId="input-pue" min={1} max={3} step={0.01} onChange={(value) => update('pue', Math.min(3, Math.max(1, value || 1)))} onExplain={openTerm} />
          <EditableField label="Tarif listrik" value={inputs.tariff} unit="IDR/kWh" plain="Harga listrik untuk tiap 1 kWh (kira-kira 1 jam setrika menyala). Makin mahal, makin besar biaya setahun." termId="tarif" help="Asumsi tarif Rp1.500/kWh; bukan penawaran tarif atau tagihan aktual lokasi." testId="input-tariff" min={0} max={100000} step={50} onChange={(value) => update('tariff', Math.min(100000, Math.max(0, value || 0)))} onExplain={openTerm} />
          <EditableField label="Faktor karbon jaringan" value={inputs.carbon} unit="kg CO₂e/kWh" plain="Berapa kilogram gas rumah kaca yang dilepas untuk menghasilkan 1 kWh listrik. Listrik dari batu bara angkanya tinggi, dari surya atau air lebih rendah." termId="faktor-karbon" help="Asumsi 0,45 kg CO₂e/kWh. Intensitas aktual berbeda menurut lokasi, waktu, dan metode akuntansi." testId="input-carbon-factor" min={0} max={2} step={0.01} onChange={(value) => update('carbon', Math.min(2, Math.max(0, value || 0)))} onExplain={openTerm} />
          <div className="formula"><strong>Rumus yang digunakan</strong><br />Daya fasilitas = daya IT × PUE<br />Energi harian = MW fasilitas × 24 jam × 1.000 kWh/MWh<br />Energi tahunan = energi harian × 365 hari<br />Biaya = kWh tahunan × tarif<br />Emisi = kWh tahunan × faktor karbon</div>
          <p className="units-note">Dalam bahasa sehari-hari: listrik seluruh gedung dihitung dari listrik komputer ditambah pendinginnya (PUE). Listrik itu dikali 24 jam dan 365 hari untuk mendapat pemakaian setahun, lalu dikali harga untuk biaya dan dikali faktor karbon untuk emisi.</p>
        </section>
        <section>
          <div className="panel">
            <div className="panel-head"><h2>Hasil untuk skenario Anda</h2><span className="eyebrow">BERUBAH LANGSUNG</span></div>
            <div className="metrics-grid">
              <div className="metric-card" data-testid="result-facility-power"><div className="metric-label">DAYA FASILITAS</div><div className="metric-value">{formatNumber(result.facilityMw, 2)} MW</div><div className="metric-unit">{formatNumber(inputs.itMw, 2)} MW IT × PUE {formatNumber(inputs.pue, 2)}</div></div>
              <div className="metric-card" data-testid="result-daily-energy"><div className="metric-label">ENERGI PER HARI</div><div className="metric-value">{formatNumber(dailyKwh / 1e6, 2)} GWh</div><div className="metric-unit">{formatNumber(dailyKwh, 0)} kWh / hari</div></div>
              <div className="metric-card" data-testid="result-annual-energy"><div className="metric-label">ENERGI PER TAHUN</div><div className="metric-value">{formatNumber(result.annualKwh / 1e9, 2)} TWh</div><div className="metric-unit">{formatNumber(result.annualKwh, 0)} kWh / tahun</div></div>
              <div className="metric-card" data-testid="result-annual-cost"><div className="metric-label">BIAYA LISTRIK / TAHUN</div><div className="metric-value">{formatRupiah(result.annualCost)}</div><div className="metric-unit">Dengan tarif model saat ini</div></div>
              {/* 1 Mt = 1 miliar kg, jadi kg dibagi 1e9. Sebelumnya dibagi 1e6 (itu hasil dalam kiloton). */}
              <div className="metric-card" data-testid="result-annual-emissions"><div className="metric-label">EMISI OPERASIONAL / TAHUN</div><div className="metric-value">{formatNumber(result.annualEmissions / 1e9, 2)} Mt CO₂e</div><div className="metric-unit">{formatNumber(result.annualEmissions, 0)} kg CO₂e dari jaringan</div></div>
              <div className="metric-card"><div className="metric-label">DAYA IT YANG DIMODELKAN</div><div className="metric-value">{formatNumber(inputs.itMw, 2)} MW</div><div className="metric-unit">Setting skenario editabel</div></div>
            </div>
            <div className="plain-summary" aria-live="polite">
              <strong>Hasilnya dalam kalimat biasa</strong>
              Dengan komputer berdaya {formatNumber(inputs.itMw, 2)} MW dan PUE {formatNumber(inputs.pue, 2)}, seluruh gedung membutuhkan sekitar {formatNumber(result.facilityMw, 2)} MW. Dalam sehari fasilitas ini memakai {formatNumber(dailyKwh, 0)} kWh listrik. Dalam setahun, listriknya berbiaya sekitar {formatRupiah(result.annualCost)} dan menghasilkan sekitar {formatNumber(result.annualEmissions / 1000, 0)} ton CO₂e.
            </div>
            <p className="units-note">Cara membaca satuan: 1 GWh = 1 juta kWh, 1 TWh = 1 miliar kWh, dan 1 Mt = 1 juta ton. Arti lengkapnya ada di kamus istilah di bawah.</p>
            <p className="scenario-note">Estimasi tidak mencakup variasi beban per jam, kehilangan transmisi, biaya demand, pajak, biaya modal, atau emisi daur hidup. Ini bukan prakiraan energi lokasi tertentu.</p>
          </div>
        </section>
      </div>

      <section className="panel glossary-panel" aria-labelledby="glossary-title">
        <div className="panel-head"><h2 id="glossary-title"><BookOpen size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Kamus istilah</h2></div>
        <dl className="glossary-list">
          {GLOSSARY.map((item) => (
            <div key={item.id} id={`istilah-${item.id}`} className={`glossary-item${activeTerm === item.id ? ' is-active' : ''}`}>
              <dt>{item.term}</dt>
              <dd>{item.meaning}</dd>
              {item.example && <dd>Contoh: {item.example}</dd>}
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
