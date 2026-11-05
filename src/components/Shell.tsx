import { Activity, BookOpen, Calculator, Compass, Zap } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

const links = [
  { href: '/', label: 'Beranda', icon: Compass },
  { href: '/kalkulator', label: 'Kalkulator', icon: Calculator },
  { href: '/simulator', label: 'Simulator', icon: Activity },
  { href: '/belajar', label: 'Belajar', icon: BookOpen },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" data-testid="link-brand">
          <span className="brand-mark"><Zap size={17} /></span>
          <span>AI ENERGY LAB</span>
        </Link>
        <nav className="nav-links" aria-label="Navigasi utama">
          {links.map(({ href, label }) => (
            <Link href={href} key={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-${label.toLowerCase()}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="eyebrow topbar-eyebrow">Project IPAS</span>
          <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <span>AI ENERGY LAB · Investigasi energi infrastruktur AI</span>
        <span>Project IPAS.</span>
      </footer>
      <nav className="mobile-menu" aria-label="Navigasi seluler">
        {links.map(({ href, label, icon: Icon }) => (
          <Link href={href} key={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`mobile-link-${label.toLowerCase()}`}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
