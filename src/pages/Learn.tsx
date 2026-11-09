
import {
  BookOpen,
  Database,
  Thermometer,
  Waves,
  Lightbulb,
  Cpu,
  Snowflake,
  Leaf,
} from 'lucide-react';

const sources = [
  {
    type: 'FACT',
    title: 'International Energy Agency (IEA)',
    year: '2025',
    detail:
      'Laporan Energy and AI memperkirakan konsumsi listrik pusat data global mencapai sekitar 415 TWh pada 2024 dan memproyeksikan sekitar 945 TWh pada 2030. Angka ini mencakup seluruh beban kerja pusat data, bukan AI saja.',
    url: 'https://www.iea.org/reports/energy-and-ai',
  },
  {
    type: 'FACT',
    title: 'IEA - Energy Demand from AI',
    year: '2025',
    detail:
      'Menjelaskan komponen pusat data, penggunaan server dan GPU, kebutuhan pendinginan, serta proyeksi konsumsi listrik. Porsi listrik untuk pendinginan berkisar dari sekitar 7% pada pusat data hyperscale yang efisien hingga lebih dari 30% pada pusat data enterprise yang kurang efisien.',
    url: 'https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai',
  },
  {
    type: 'Asumsi',
    title: 'asumsi dari kelompok kami',
    year: '2026',
    detail:
      'kelompok kami berdiskusi bagaimana cara mengurangi pemborosan listrik pada AI.',
  },
];

const topics = [
  {
    icon: BookOpen,
    title: 'GPU dan server berdaya tinggi',
    text:
      'AI menggunakan prosesor seperti GPU untuk melakukan banyak perhitungan secara bersamaan. Perangkat ini membutuhkan listrik ketika melatih model maupun memproses permintaan pengguna.',
  },
  {
    icon: Database,
    title: 'Sistem pendingin',
    text:
      'Server menghasilkan panas saat bekerja. Pusat data membutuhkan kipas, chiller, pompa, atau sistem pendingin lainnya untuk menjaga suhu perangkat tetap aman.',
  },
  {
    icon: Thermometer,
    title: 'Pemrosesan AI berulang',
    text:
      'Setiap permintaan AI membutuhkan komputasi. Pelatihan model dan penggunaan model secara berulang dapat meningkatkan konsumsi listrik, bergantung pada ukuran model dan kompleksitas tugas.',
  },
  {
    icon: Waves,
    title: 'Pertumbuhan pengguna dan pusat data',
    text:
      'Semakin banyak layanan AI digunakan, semakin besar kapasitas komputasi yang perlu disediakan. Peningkatan efisiensi dapat membantu menekan konsumsi per tugas, tetapi total listrik tetap bisa meningkat ketika penggunaan bertambah.',
  },
];

const solusi = [
  {
    icon: Lightbulb,
    title: 'Menggunakan model AI yang lebih kecil',
    text:
      'model yang lebih kecil hanya membutuhkan energi yang sedikit dibanding model AI yang besar.',
  },
  {
    icon: Cpu,
    title: 'Mengoptimalkan perangkat keras',
    text:
      'Pengelola pusat data dapat menggunakan server dan akselerator yang lebih hemat energi untuk menyelesaikan tugas yang sama dengan konsumsi listrik lebih rendah.',
  },
  {
    icon: Snowflake,
    title: 'Meningkatkan efisiensi pendinginan',
    text:
      'Sistem pendingin yang dirancang dengan baik, pengaturan suhu yang tepat, dan pemantauan penggunaan energi dapat mengurangi listrik tambahan untuk mengelola panas.',
  },
  {
    icon: Leaf,
    title: 'Menggunakan energi terbarukan',
    text:
      'dapat menggunakan listrik dari tenaga surya, angin dan energi terbarukan lainnya ',
  },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="section-title">{title}</h2>
      </div>
      <p className="section-copy">{description}</p>
    </div>
  );
}

export default function Learn() {
  return (
    <div className="page fade-in">
      {/* CATATAN LAPANGAN */}
      <header className="page-head">
        <div>
          <div className="eyebrow">CATATAN LAPANGAN</div>

          <h1>
            mengapa
            <br />
            AI bisa boros listrik?
          </h1>

          <p>
            AI bisa boros listrik karena membutuhkan komputer
            berkemampuan tinggi untuk melatih model, memproses
            permintaan pengguna, dan menghasilkan jawaban.
            Komputer-komputer tersebut biasanya berada di pusat
            data (data center) yang beroperasi hampir sepanjang waktu.
          </p>
        </div>

        <span className="eyebrow">
          berdasarkan sumber yang ditemukan
        </span>
      </header>

      {/* PENYEBAB AI BOROS LISTRIK */}
      <div className="learn-grid">
        {topics.map(({ icon: Icon, title, text }) => (
          <article className="panel learn-card" key={title}>
            <Icon size={20} color="hsl(var(--primary))" />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>

      {/* SOLUSI: LANGSUNG SETELAH CATATAN LAPANGAN */}
      <section className="section">
        <SectionHeading
          eyebrow="LANGKAH PERBAIKAN / 01—04"
          title={
            <>
              bagaimana
              <br />
              mengurangi dampaknya?
            </>
          }
          description="ada beberapa cara untuk mengurangi dampak pemborosan listrik pada AI."
        />

        <div className="learn-grid">
          {solusi.map(({ icon: Icon, title, text }) => (
            <article className="panel learn-card" key={title}>
              <Icon size={20} color="hsl(var(--primary))" />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CATATAN SUMBER */}
      <section className="section">
        <SectionHeading
          eyebrow="CATATAN SUMBER / 01—02"
          title={
            <>
              sumber
              <br />
              yang kami temukan
            </>
          }
          description="Referensi utama untuk memahami konsumsi listrik pusat data dan kebutuhan energi AI."
        />

        <div className="source-list">
          {sources.map((source, index) => (
            <article
              className="source-card"
              key={source.url}
            >
              <div>
                <span
                  className={
                    source.type === 'FACT'
                      ? 'fact-tag'
                      : 'assumption-tag'
                  }
                >
                  {source.type}
                </span>

                <div className="field-help">
                  SUMBER {String(index + 1).padStart(2, '0')}
                  {' / '}
                  {source.year}
                </div>
              </div>

              <div>
                <h3>{source.title}</h3>
                <p className="field-help">{source.detail}</p>

                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Baca sumber asli ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
