'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { StampCard } from '@/components/stamp/StampCard';
import { clientApi, setClientToken } from '@/lib/client-api';

interface Stamp {
  id:           string;
  imageUrl:     string;
  caption:      string | null;
  locationName: string | null;
  takenAt:      string;
  tags:         { tag: string }[];
  user:         { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  _count:       { likes: number; comments: number };
}

export default function ExplorePage() {
  const { getToken } = useAuth();
  const [stamps,      setStamps]      = useState<Stamp[]>([]);
  const [cursor,      setCursor]      = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [tagFilter,   setTagFilter]   = useState('');
  const [locFilter,   setLocFilter]   = useState('');
  const [followed,    setFollowed]    = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    const token = await getToken();
    setClientToken(token);
    try {
      const { data } = await clientApi.get('/api/feed/explore', {
        params: {
          limit: 20,
          ...(reset ? {} : cursor ? { cursor } : {}),
          ...(tagFilter  ? { tag: tagFilter }                  : {}),
          ...(locFilter  ? { location_name: locFilter }        : {}),
        },
      });
      setStamps(prev => reset ? data.stamps : [...prev, ...data.stamps]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally { setLoading(false); }
  }, [cursor, tagFilter, locFilter, loading, getToken]);

  // Initial load + re-load on filter change
  useEffect(() => { load(true); }, [tagFilter, locFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) load(); },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [load, hasMore]);

  async function handleFollow(username: string) {
    const next = !followed[username];
    setFollowed(prev => ({ ...prev, [username]: next }));
    try {
      if (next) await clientApi.post(`/api/users/${username}/follow`);
      else      await clientApi.delete(`/api/users/${username}/follow`);
    } catch { setFollowed(prev => ({ ...prev, [username]: !next })); }
  }

  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-md)' }}>Explore</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Filter by tag…"
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <input
          className="input"
          placeholder="Filter by location…"
          value={locFilter}
          onChange={e => setLocFilter(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        {(tagFilter || locFilter) && (
          <button className="btn btn-ghost" onClick={() => { setTagFilter(''); setLocFilter(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Masonry grid — Frontend-Spec §7 */}
      <div className="masonry-grid">
        {stamps.map(stamp => (
          <div key={stamp.id} style={{ marginBottom: 12 }}>
            <Link href={`/stamp/${stamp.id}`} style={{ display: 'block', textDecoration: 'none' }}>
              <StampCard
                imageUrl={stamp.imageUrl}
                imageAlt={stamp.caption ?? 'Stamp'}
                caption={stamp.caption ?? undefined}
                locationName={stamp.locationName ?? undefined}
                date={new Date(stamp.takenAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })}
              />
            </Link>

            {/* Author + Follow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingLeft: 2 }}>
              <Link href={`/profile/${stamp.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-paper-dark)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  {stamp.user.avatarUrl && <img src={stamp.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-muted)' }}>
                  {stamp.user.displayName ?? stamp.user.username}
                </span>
              </Link>
              <button
                onClick={() => handleFollow(stamp.user.username)}
                className={followed[stamp.user.username] ? 'btn btn-ghost' : 'btn btn-secondary'}
                style={{ padding: '3px 10px', fontSize: 11 }}
              >
                {followed[stamp.user.username] ? 'Following' : 'Follow'}
              </button>
            </div>

            {/* Likes + comments */}
            <div style={{ display: 'flex', gap: 10, paddingLeft: 2, paddingTop: 3 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-muted)' }}>♡ {stamp._count.likes}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-muted)' }}>💬 {stamp._count.comments}</span>
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {!loading && stamps.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
          No stamps found. Try different filters.
        </div>
      )}
    </div>
  );
}
