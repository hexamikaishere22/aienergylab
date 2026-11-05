import { ArrowDownRight, ArrowRight, Cpu, Fan, Factory, Gauge, Leaf, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { calculateScenario, formatNumber } from '../lib/energy';
import { useEnergy } from '../lib/EnergyContext';

const causes = [
  { n: '01 / KOMPUTASI', title: 'Kerja dimulai di chip', body: 'Pelatihan dan inferensi menjalankan operasi matematika dalam skala besar. Akselerator AI bekerja berjam-jam, dan daya yang dipakainya berubah mengikuti jenis beban, utilisasi, serta rancangan model.', icon: Cpu },
  { n: '02 / PERALATAN', title: 'Chip bukan seluruh fasilitas', body: 'Server, jaringan, penyimpanan, dan sistem pendukung ikut memakai listrik. Daya IT adalah beban perangkat komputasi yang menjadi titik awal model kita.', icon: Factory },
  { n: '03 / PANAS', title: 'Listrik berubah menjadi panas', body: 'Hampir seluruh energi yang dipakai perangkat berakhir sebagai panas. Pendinginan udara atau cairan memindahkan panas itu keluar agar perangkat dapat terus beroperasi.', icon: Fan },
  { n: '04 / OVERHEAD', title: 'Gedung menambah beban', body: 'Pompa, kipas, UPS, pencahayaan, dan kehilangan distribusi membuat konsumsi fasilitas lebih besar daripada konsumsi IT saja. PUE merangkum hubungan ini.', icon: Gauge },
];

export default function Home() {
  const { inputs } = useEnergy();
  const result = calculateScenario('Dasar', inputs.itMw, inputs.pue, inputs.tariff, inputs.carbon);
  return (
    <div className="page fade-in">
      <section className="hero-grid">
        <div>
          <div className="eyebrow">PUSAT DATA · DAYA · PILIHAN</div>
          <h1 className="hero-title">AI memakai <em>LISTRIK.</em></h1>
          <p className="lead">Di balik setiap jawaban AI ada chip yang bekerja, panas yang harus dipindahkan, dan fasilitas yang harus tetap menyala. Jadilah konsultan energi: ubah asumsi, uji pilihan, lihat konsekuensinya.</p>
          <div className="button-row">
            <Link href="/simulator" className="button" data-testid="button-start-simulator">Mulai eksperimen <ArrowRight size={16} /></Link>
            <Link href="/belajar" className="button secondary" data-testid="button-learn">Mulai belajar  <ArrowDownRight size={16} /></Link>
          </div>
        </div>
        <div className="visual-panel" data-testid="panel-live-energy">
          <div className="visual-title">Skenario / fasilitas tahunan</div>
          <svg className="rack-illustration" viewBox="0 0 220 230" role="img" aria-label="Ilustrasi tiga rak server di ruang pusat data">
            <path d="M19 205h183" stroke="#9eb8a9" strokeOpacity=".45" strokeWidth="1" />
            <path d="M32 204V40q0-7 7-7h39q7 0 7 7v164M95 204V24q0-7 7-7h39q7 0 7 7v180M158 204V40q0-7 7-7h18q7 0 7 7v164" fill="#214c43" stroke="#bad0bf" strokeOpacity=".8" strokeWidth="1.5" />
            <path d="M36 47h45M36 79h45M36 111h45M36 143h45M36 175h45M99 34h45M99 66h45M99 98h45M99 130h45M99 162h45M162 47h24M162 79h24M162 111h24M162 143h24M162 175h24" stroke="#8da99a" strokeOpacity=".66" strokeWidth="1" />
            <g fill="#e8a073">
              <circle cx="42" cy="58" r="2" /><circle cx="42" cy="90" r="2" /><circle cx="42" cy="122" r="2" /><circle cx="42" cy="154" r="2" /><circle cx="42" cy="186" r="2" />
              <circle cx="105" cy="45" r="2" /><circle cx="105" cy="77" r="2" /><circle cx="105" cy="109" r="2" /><circle cx="105" cy="141" r="2" /><circle cx="105" cy="173" r="2" />
            </g>
            <g fill="#92c8a2">
              <circle cx="49" cy="58" r="1.5" /><circle cx="49" cy="90" r="1.5" /><circle cx="49" cy="122" r="1.5" /><circle cx="49" cy="154" r="1.5" />
              <circle cx="112" cy="45" r="1.5" /><circle cx="112" cy="77" r="1.5" /><circle cx="112" cy="109" r="1.5" /><circle cx="112" cy="141" r="1.5" />
            </g>
            <path d="M55 58h18m-18 32h18m-18 32h18m-18 32h18m11-109h18m-18 32h18m-18 32h18m-18 32h18m-18 32h18m27-128h17m-17 32h17m-17 32h17m-17 32h17m-17 32h17" stroke="#d8e4d9" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 218h190" stroke="#e8a073" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
            <path d="M25 215v-12m170 12v-12" stroke="#e8a073" strokeOpacity=".48" strokeWidth="1" />
          </svg>
          <div className="energy-readout">
            <div className="energy-number">{formatNumber(result.annualKwh / 1e9, 2)}</div>
            <div className="energy-caption">TWh listrik per tahun · hasil model saat ini</div>
          </div>
          <div className="flow-lines" aria-hidden="true">
            {[30, 46, 58, 39, 73, 64, 82, 48, 70, 58, 91, 67, 77, 51, 85, 61, 73, 96, 69, 48, 79, 62].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div><div className="eyebrow">PETA MASALAH / 01—04</div><h2 className="section-title">Dari komputasi ke<br />beban fasilitas.</h2></div>
          <p className="section-copy">Pertanyaan penting bukan hanya berapa daya yang dipakai satu chip. Kita perlu melihat rantai energi dari perangkat sampai gedung — lalu menguji di mana intervensi paling berarti.</p>
        </div>
        <div className="explain-grid">
          {causes.map(({ n, title, body, icon: Icon }) => (
            <article className="explain-card" key={n}>
              <div className="step-no">{n}</div>
              <Icon size={21} strokeWidth={1.7} color="hsl(var(--primary))" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div><div className="eyebrow">FYI</div><h2 className="section-title">for your informataion</h2></div>
          <p className="section-copy">Ada beberapa fakta tentang AI yang cukup mengejutkan, terutama soal listrik, air, dan dampak lingkungannya. Yang menarik, dampak AI bukan hanya berasal dari proses melatih model, tetapi juga dari jutaan hingga miliaran permintaan yang diproses setiap hari..</p>
        </div>
        <div className="metrics-grid">
          <div className="metric-card"><div className="metric-label">Konsumsi Listrik AI = Konsumsi Listrik Sebuah Negara</div><div className="metric-value">485 TWh</div><div className="metric-unit">Konsumsi listrik pusat data meningkat sekitar 485 TWh pada 2025 menjadi 950 TWh pada 2030.</div></div>
          <div className="metric-card"><div className="metric-label">Satu rak server AI bisa membutuhkan daya setara puluhan rumah</div><div className="metric-value">65 rumah</div><div className="metric-unit">IEA memperkirakan kalau 2027 kebutuhan daya satu rak server AI dapat setara dengan kebutuhan daya sekitar 65 rumah tangga</div></div>
          <div className="metric-card"><div className="metric-label">melatih satu model AI = menguapkan ratusan ribu liter air</div><div className="metric-value">700.000 liter</div><div className="metric-unit">Sebuah penelitian tentang jejak air AI memperkirakan bahwa pelatihan model bahasa GPT-3 menggunakan sistem pusat data Microsoft dapat menyebabkan sekitar 700.000 liter air tawar atau 350.000 botol air berukuran dua liter.</div></div>
          <div className="metric-card"><div className="metric-label">tidak semua AI membutuhkan energi yang sama</div><div className="metric-value">-</div><div className="metric-unit">Menurut IEA, penggunaan AI untuk menghasilkan video, melakukan penalaran yang lebih kompleks, atau menjalankan agen AI dapat membutuhkan energi ratusan hingga ribuan kali lebih besar per permintaan dibandingkan pembuatan teks sederhana.</div></div>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div><div className="eyebrow">Anggota Kelompok</div><h2 className="section-title">List<br />Anggota Kelompok 1</h2></div>
        </div>
        <div className="explain-grid">
          <article className="explain-card"><div className="step-no">anggota Kelompok</div><Cpu size={21} color="hsl(var(--primary))" /><h3>Mikael Adonai Hizkia Prasetyo</h3><p>Bertugas Untuk Membuat Website dan menyajikan Laporan.</p></article>
          <article className="explain-card"><div className="step-no">anggota Kelompok</div><Zap size={21} color="hsl(var(--primary))" /><h3>Mikhael Jevon Adribhagawanta</h3><p>Bertugas Untuk Mencatat materi dan meneliti sumber sumber yang ada.</p></article>
          <article className="explain-card"><div className="step-no">anggota Kelompok</div><Fan size={21} color="hsl(var(--primary))" /><h3>Joaquin Alvaro Aradira</h3><p>Bertugas Untuk Mencatat solusi dan Meneliti Solusi yang Akan Digunakan.</p></article>
        </div> 
      </section>
    </div>
  );
}
