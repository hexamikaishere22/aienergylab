
import {
  ArrowDownRight,
  ArrowRight,
  Cpu,
  Fan,
  Factory,
  Gauge,
  Zap,
} from 'lucide-react';
import { Link } from 'wouter';

const causes = [
  {
    n: '01 / KOMPUTASI',
    title: 'Kerja dimulai di chip',
    body: 'Pelatihan dan inferensi menjalankan operasi matematika dalam skala besar. Akselerator AI bekerja berjam-jam, dan daya yang dipakainya berubah mengikuti jenis beban, utilisasi, serta rancangan model.',
    icon: Cpu,
  },
  {
    n: '02 / PERALATAN',
    title: 'Chip bukan seluruh fasilitas',
    body: 'Server, jaringan, penyimpanan, dan sistem pendukung ikut memakai listrik. Daya IT adalah beban perangkat komputasi yang menjadi titik awal model kita.',
    icon: Factory,
  },
  {
    n: '03 / PANAS',
    title: 'Listrik berubah menjadi panas',
    body: 'Hampir seluruh energi yang dipakai perangkat berakhir sebagai panas. Pendinginan udara atau cairan memindahkan panas itu keluar agar perangkat dapat terus beroperasi.',
    icon: Fan,
  },
  {
    n: '04 / OVERHEAD',
    title: 'Gedung menambah beban',
    body: 'Pompa, kipas, UPS, pencahayaan, dan kehilangan distribusi membuat konsumsi fasilitas lebih besar daripada konsumsi IT saja. PUE merangkum hubungan ini.',
    icon: Gauge,
  },
];

export default function Home() {
  return (
    <div className="page fade-in">

      {/* HERO SECTION */}
      <section className="hero-grid">
        <div>
          <div className="eyebrow">
            PUSAT DATA · DAYA · PILIHAN
          </div>

          <h1 className="hero-title">
            AI memakai <em>LISTRIK.</em>
          </h1>

          <p className="lead">
            Di balik setiap jawaban AI ada chip yang bekerja,
            panas yang harus dipindahkan, dan fasilitas yang
            harus tetap menyala. Jadilah konsultan energi:
            ubah asumsi, uji pilihan, lihat konsekuensinya.
          </p>

          <div className="button-row">
            <Link
              href="/simulator"
              className="button"
              data-testid="button-start-simulator"
            >
              Mulai eksperimen <ArrowRight size={16} />
            </Link>

            <Link
              href="/belajar"
              className="button secondary"
              data-testid="button-learn"
            >
              Mulai belajar <ArrowDownRight size={16} />
            </Link>
          </div>
        </div>

        {/* PANEL LOGO SEKOLAH */}
        <div
          className="visual-panel school-logo-panel"
          data-testid="panel-school-logo"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '22px',
            minHeight: '420px',
            padding: '24px',
          }}
        >
          <div className="visual-title">
            IDENTITAS SEKOLAH
          </div>

          <div
            className="school-logo-frame"
            style={{
              width: 'min(100%, 320px)',
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              borderRadius: '50%',
              padding: '12px',
              boxShadow: '0 12px 35px rgba(0,0,0,0.16)',
              overflow: 'hidden',
            }}
          >
            <img
              src="https://raw.githubusercontent.com/hexamikaishere22/aienergylab/main/dist/assets/MIKAEL-LOGO-UPDATE.png"
              alt="Logo SMK Mikael Surakarta"
              className="school-logo-image"
              loading="lazy"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          <div className="school-logo-caption">
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '1px',
              }}
            >
              SMK MIKAEL SURAKARTA
            </h3>

            <p
              style={{
                fontSize: '0.8rem',
                opacity: 0.7,
                margin: '6px 0 0',
              }}
            >
              Centre of Technical Education
            </p>
          </div>
        </div>
      </section>

      {/* PENJELASAN RANTAI ENERGI */}
      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              PETA MASALAH / 01—04
            </div>

            <h2 className="section-title">
              Dari komputasi ke
              <br />
              beban fasilitas.
            </h2>
          </div>

          <p className="section-copy">
            Pertanyaan penting bukan hanya berapa daya yang
            dipakai satu chip. Kita perlu melihat rantai energi
            dari perangkat sampai gedung — lalu menguji di mana
            intervensi paling berarti.
          </p>
        </div>

        <div className="explain-grid">
          {causes.map(({ n, title, body, icon: Icon }) => (
            <article className="explain-card" key={n}>
              <div className="step-no">{n}</div>

              <Icon
                size={21}
                strokeWidth={1.7}
                color="hsl(var(--primary))"
              />

              <h3>{title}</h3>

              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FAKTA TENTANG AI */}
      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FYI</div>

            <h2 className="section-title">
              For Your Information
            </h2>
          </div>

          <p className="section-copy">
            Ada beberapa fakta tentang AI yang cukup mengejutkan,
            terutama soal listrik, air, dan dampak lingkungannya.
            Yang menarik, dampak AI bukan hanya berasal dari proses
            melatih model, tetapi juga dari jutaan hingga miliaran
            permintaan yang diproses setiap hari.
          </p>
        </div>

        <div className="metrics-grid">

          <div className="metric-card">
            <div className="metric-label">
              Konsumsi Listrik AI = Konsumsi Listrik Sebuah Negara
            </div>

            <div className="metric-value">
              485 TWh
            </div>

            <div className="metric-unit">
              Konsumsi listrik pusat data meningkat sekitar
              485 TWh pada 2025 menjadi 950 TWh pada 2030.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">
              Satu rak server AI bisa membutuhkan daya setara
              puluhan rumah
            </div>

            <div className="metric-value">
              65 rumah
            </div>

            <div className="metric-unit">
              IEA memperkirakan kalau 2027 kebutuhan daya
              satu rak server AI dapat setara dengan kebutuhan
              daya sekitar 65 rumah tangga.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">
              Melatih satu model AI = menguapkan ratusan ribu liter air
            </div>

            <div className="metric-value">
              700.000 liter
            </div>

            <div className="metric-unit">
              Sebuah penelitian tentang jejak air AI memperkirakan
              bahwa pelatihan model bahasa GPT-3 menggunakan sistem
              pusat data Microsoft dapat menyebabkan sekitar
              700.000 liter air tawar atau 350.000 botol air
              berukuran dua liter.
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">
              Tidak semua AI membutuhkan energi yang sama
            </div>

            <div className="metric-value">
              -
            </div>

            <div className="metric-unit">
              Menurut IEA, penggunaan AI untuk menghasilkan video,
              melakukan penalaran yang lebih kompleks, atau
              menjalankan agen AI dapat membutuhkan energi ratusan
              hingga ribuan kali lebih besar per permintaan
              dibandingkan pembuatan teks sederhana.
            </div>
          </div>

        </div>
      </section>

      {/* ANGGOTA KELOMPOK */}
      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              Anggota Kelompok
            </div>

            <h2 className="section-title">
              List
              <br />
              Anggota Kelompok 1
            </h2>
          </div>
        </div>

        <div className="explain-grid">

          <article className="explain-card">
            <div className="step-no">
              Anggota Kelompok
            </div>

            <Cpu
              size={21}
              color="hsl(var(--primary))"
            />

            <h3>
              Mikael Adonai Hizkia Prasetyo
            </h3>

            <p>
              Bertugas Untuk Membuat Website dan menyajikan Laporan.
            </p>
          </article>

          <article className="explain-card">
            <div className="step-no">
              Anggota Kelompok
            </div>

            <Zap
              size={21}
              color="hsl(var(--primary))"
            />

            <h3>
              Mikhael Jevon Adribhagawanta
            </h3>

            <p>
              Bertugas Untuk Mencatat materi dan meneliti
              sumber sumber yang ada.
            </p>
          </article>

          <article className="explain-card">
            <div className="step-no">
              Anggota Kelompok
            </div>

            <Fan
              size={21}
              color="hsl(var(--primary))"
            />

            <h3>
              Joaquin Alvaro Aradira
            </h3>

            <p>
              Bertugas Untuk Mencatat solusi dan Meneliti
              Solusi yang Akan Digunakan.
            </p>
          </article>

        </div>
      </section>

    </div>
  );
}
