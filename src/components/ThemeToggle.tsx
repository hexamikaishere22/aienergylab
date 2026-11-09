import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Pilihan tampilan Terang / Gelap.
 * Pilihan disimpan di localStorage oleh next-themes sehingga bertahan saat halaman dimuat ulang.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Sebelum mounted, tema belum pasti: jangan tandai tombol mana pun aktif.
  const active = mounted ? resolvedTheme : undefined;

  return (
    <div className="theme-toggle" role="group" aria-label="Pilih tampilan terang atau gelap">
      <button
        type="button"
        className="theme-toggle-btn"
        aria-pressed={active === 'light'}
        onClick={() => setTheme('light')}
        data-testid="button-theme-light"
      >
        <Sun size={14} aria-hidden="true" />
        <span>Terang</span>
      </button>
      <button
        type="button"
        className="theme-toggle-btn"
        aria-pressed={active === 'dark'}
        onClick={() => setTheme('dark')}
        data-testid="button-theme-dark"
      >
        <Moon size={14} aria-hidden="true" />
        <span>Gelap</span>
      </button>
    </div>
  );
}
