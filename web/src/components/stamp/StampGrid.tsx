'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { StampCard } from './StampCard';
import { clientApi, setClientToken } from '@/lib/client-api';

interface Stamp {
  id:           string;
  imageUrl:     string;
  caption:      string | null;
  locationName: string | null;
  takenAt:      string;
  tags:         { tag: string }[];
}

interface StampGridProps {
  initialStamps?: Stamp[];
  initialCursor?: string | null;
}

export function StampGrid({ initialStamps = [], initialCursor = null }: StampGridProps) {
  const { getToken } = useAuth();
  const [stamps,     setStamps]     = useState<Stamp[]>(initialStamps);
  const [cursor,     setCursor]     = useState<string | null>(initialCursor);
  const [loading,    setLoading]    = useState(false);
  const [hasMore,    setHasMore]    = useState(!!initialCursor);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Wire up the Clerk token, and — if SSR returned no stamps (e.g. the
  // server-side token was unavailable) — fetch the first page client-side so
  // the grid recovers instead of being stuck on the empty state.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      const token = await getToken();
      setClientToken(token);
      if (initialStamps.length > 0) return;
      setLoading(true);
      try {
        const { data } = await clientApi.get('/api/stamps', { params: { limit: 20 } });
        setStamps(data.stamps);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch (err) {
        console.error('Failed to load stamps:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, initialStamps.length]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const token = await getToken();
      setClientToken(token);
      const { data } = await clientApi.get('/api/stamps', {
        params: { cursor, limit: 20 },
      });
      setStamps(prev => [...prev, ...data.stamps]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.error('Failed to load stamps:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, getToken]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  if (stamps.length === 0 && !loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 400, gap: 16, color: 'var(--color-muted)',
      }}>
        <span style={{ fontSize: 64 }}>✉</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--color-ink)', margin: 0 }}>
          Your archive awaits.
        </h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, textAlign: 'center', maxWidth: 340, margin: 0 }}>
          Tap <strong style={{ color: 'var(--color-stamp-red)' }}>+ Stamp</strong> to capture your first memory.
        </p>
        <Link href="/stamp/new" className="btn btn-primary" style={{ marginTop: 8 }}>
          + Stamp a Memory
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Grid — Frontend-Spec §7: auto-fill minmax(160px,1fr), gap 12px */}
      <div className="stamp-grid">
        {stamps.map(stamp => (
          <Link key={stamp.id} href={`/stamp/${stamp.id}`} style={{ textDecoration: 'none' }}>
            <StampCard
              imageUrl={stamp.imageUrl}
              imageAlt={stamp.caption ?? 'Stamp'}
              caption={stamp.caption ?? undefined}
              locationName={stamp.locationName ?? undefined}
              date={new Date(stamp.takenAt).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: '2-digit',
              })}
            />
          </Link>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '24px 0', color: 'var(--color-muted)',
          fontFamily: 'var(--font-ui)', fontSize: 14,
        }}>
          Loading…
        </div>
      )}
    </div>
  );
}
