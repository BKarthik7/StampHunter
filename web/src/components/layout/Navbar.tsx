'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

const NAV_LINKS = [
  { href: '/home',    label: 'Collection' },
  { href: '/explore', label: 'Explore'    },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--color-paper)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <nav style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 var(--space-xl)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-lg)',
      }}>
        {/* Brand */}
        <Link href="/home" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-ink)',
          letterSpacing: '-0.3px',
        }}>
          ✉ StampHunter
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              color: pathname.startsWith(href) ? 'var(--color-stamp-red)' : 'var(--color-muted)',
              transition: 'color 0.15s',
              borderBottom: pathname.startsWith(href) ? '2px solid var(--color-stamp-red)' : '2px solid transparent',
              paddingBottom: 2,
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right: create + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Link href="/stamp/new" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            + Stamp
          </Link>
          <UserButton />
        </div>
      </nav>
    </header>
  );
}
