import { serverApi } from '@/lib/api';
import { StampGrid } from '@/components/stamp/StampGrid';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch first page of stamps server-side for fast initial render
  let initialStamps: any[] = [];
  let initialCursor: string | null = null;

  try {
    const api = await serverApi();
    const { data } = await api.get('/api/stamps', { params: { limit: 20 } });
    initialStamps = data.stamps ?? [];
    initialCursor = data.nextCursor ?? null;
  } catch {
    // If fetch fails (e.g. server not running), show empty grid
  }

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

      <StampGrid
        initialStamps={initialStamps}
        initialCursor={initialCursor}
      />
    </div>
  );
}
