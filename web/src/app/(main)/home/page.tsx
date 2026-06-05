import { serverApi } from '@/lib/api';
import { StampGrid } from '@/components/stamp/StampGrid';
import { AlbumsSection } from '@/components/album/AlbumsSection';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let initialStamps: any[] = [];
  let initialCursor: string | null = null;

  try {
    const api = await serverApi();
    const { data } = await api.get('/api/stamps', { params: { limit: 20 } });
    initialStamps = data.stamps ?? [];
    initialCursor = data.nextCursor ?? null;
  } catch {}

  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 'var(--space-lg)',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0 }}>
          My Collection
        </h1>
        <Link href="/stamp/new" className="btn btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
          + Stamp
        </Link>
      </div>

      {/* Albums row — client component for interactivity */}
      <AlbumsSection />

      {/* Stamps grid */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 'var(--space-md)' }}>Stamps</h2>
        <StampGrid initialStamps={initialStamps} initialCursor={initialCursor} />
      </div>
    </div>
  );
}
