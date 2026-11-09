import { Calculator as CalculatorIcon, Info } from 'lucide-react';
import { calculateScenario, formatNumber, formatRupiah } from '../lib/energy';
import { useEnergy } from '../lib/EnergyContext';

function EditableField({ label, value, unit, help, testId, min, max, step, onChange }: { label: string; value: number; unit: string; help: string; testId: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div className="field">
      <div className="field-label"><span>{label}</span><span className="assumption-tag">ASUMSI EDITABEL</span></div>
      <div className="input-wrap">
        <input aria-label={label} type="number" value={value} min={min} max={max} step={step} data-testid={testId} onChange={(event) => onChange(Number(event.target.value))} />
        <span className="input-unit">{unit}</span>
      </div>
      <div className="field-help">{help}</div>
    </div>
  );
}

export default function Calculator() {
  const { inputs, update } = useEnergy();
  const result = calculateScenario('Dasar', inputs.itMw, inputs.pue, inputs.tariff, inputs.carbon);
  const dailyKwh = result.facilityMw * 24 * 1000;
  return (
    <div className="page fade-in">
      <header className="page-head">
        <div><div className="eyebrow">RUANG KERJA / 01</div><h1>Kalkulator energi</h1><p>Bangun estimasi fasilitas Anda sendiri. Semua nilai input dapat diubah; hasil akan dihitung ulang seketika.</p></div>
        <span className="assumption-tag"><Info size={12} style={{ marginRight: 5 }} /> MODEL ILUSTRATIF</span>
      </header>
      <div className="calculator-grid">
        <section className="panel">
          <div className="panel-head"><h2><CalculatorIcon size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Parameter model</h2></div>
          <EditableField label="Daya IT / komputasi" value={inputs.itMw} unit="MW" help="Setting skenario, bukan pengukuran fasilitas tertentu. Rentang 0,1–500 MW." testId="input-it-mw" min={0.1} max={500} step={0.1} onChange={(value) => update('itMw', Math.min(500, Math.max(.1, value || .1)))} />
          <EditableField label="PUE" value={inputs.pue} unit="rasio" help="Asumsi model 1,4. PUE = energi fasilitas ÷ energi peralatan IT; nilai lebih rendah berarti overhead lebih kecil." testId="input-pue" min={1} max={3} step={0.01} onChange={(value) => update('pue', Math.min(3, Math.max(1, value || 1)))} />
          <EditableField label="Tarif listrik" value={inputs.tariff} unit="IDR/kWh" help="Asumsi tarif Rp1.500/kWh; bukan penawaran tarif atau tagihan aktual lokasi." testId="input-tariff" min={0} max={100000} step={50} onChange={(value) => update('tariff', Math.min(100000, Math.max(0, value || 0)))} />
          <EditableField label="Faktor karbon jaringan" value={inputs.carbon} unit="kg CO₂e/kWh" help="Asumsi 0,45 kg CO₂e/kWh. Intensitas aktual berbeda menurut lokasi, waktu, dan metode akuntansi." testId="input-carbon-factor" min={0} max={2} step={0.01} onChange={(value) => update('carbon', Math.min(2, Math.max(0, value || 0)))} />
          <div className="formula"><strong>Rumus yang digunakan</strong><br />Daya fasilitas = daya IT × PUE<br />Energi harian = MW fasilitas × 24 jam × 1.000 kWh/MWh<br />Energi tahunan = energi harian × 365 hari<br />Biaya = kWh tahunan × tarif<br />Emisi = kWh tahunan × faktor karbon</div>
        </section>
        <section>
          <div className="panel">
            <div className="panel-head"><h2>Hasil untuk skenario Anda</h2><span className="eyebrow">BERUBAH LANGSUNG</span></div>
            <div className="metrics-grid">
              <div className="metric-card" data-testid="result-facility-power"><div className="metric-label">DAYA FASILITAS</div><div className="metric-value">{formatNumber(result.facilityMw, 2)} MW</div><div className="metric-unit">{formatNumber(inputs.itMw, 2)} MW IT × PUE {formatNumber(inputs.pue, 2)}</div></div>
              <div className="metric-card" data-testid="result-daily-energy"><div className="metric-label">ENERGI PER HARI</div><div className="metric-value">{formatNumber(dailyKwh / 1e6, 2)} GWh</div><div className="metric-unit">{formatNumber(dailyKwh, 0)} kWh / hari</div></div>
              <div className="metric-card" data-testid="result-annual-energy"><div className="metric-label">ENERGI PER TAHUN</div><div className="metric-value">{formatNumber(result.annualKwh / 1e9, 2)} TWh</div><div className="metric-unit">{formatNumber(result.annualKwh, 0)} kWh / tahun</div></div>
              <div className="metric-card" data-testid="result-annual-cost"><div className="metric-label">BIAYA LISTRIK / TAHUN</div><div className="metric-value">{formatRupiah(result.annualCost)}</div><div className="metric-unit">Dengan tarif model saat ini</div></div>
              <div className="metric-card" data-testid="result-annual-emissions"><div className="metric-label">EMISI OPERASIONAL / TAHUN</div><div className="metric-value">{formatNumber(result.annualEmissions / 1e6, 2)} Mt CO₂e</div><div className="metric-unit">{formatNumber(result.annualEmissions, 0)} kg CO₂e dari jaringan</div></div>
              <div className="metric-card"><div className="metric-label">DAYA IT YANG DIMODELKAN</div><div className="metric-value">{formatNumber(inputs.itMw, 2)} MW</div><div className="metric-unit">Setting skenario editabel</div></div>
            </div>
            <p className="scenario-note">Estimasi tidak mencakup variasi beban per jam, kehilangan transmisi, biaya demand, pajak, biaya modal, atau emisi daur hidup. Ini bukan prakiraan energi lokasi tertentu.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
