'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { StampCard } from '@/components/stamp/StampCard';
import { clientApi, setClientToken } from '@/lib/client-api';

interface Stamp {
  id: string; imageUrl: string; caption: string | null;
  locationName: string | null; takenAt: string;
}

interface Album {
  id: string; name: string;
  _count: { stamps: number };
}

export default function AlbumDetailPage({ params }: { params: { id: string } }) {
  const { getToken }           = useAuth();
  const [album,   setAlbum]   = useState<Album | null>(null);
  const [stamps,  setStamps]  = useState<Stamp[]>([]);
  const [cursor,  setCursor]  = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const token = await getToken();
    setClientToken(token);
    try {
      const [albumRes, stampsRes] = reset
        ? await Promise.all([
            clientApi.get(`/api/albums/${params.id}`),
            clientApi.get(`/api/albums/${params.id}/stamps`, { params: { limit: 20 } }),
          ])
        : [null, await clientApi.get(`/api/albums/${params.id}/stamps`, { params: { limit: 20, cursor } })];

      if (albumRes) setAlbum(albumRes.data.album);
      const newStamps = stampsRes.data.stamps ?? stampsRes.data.stamp_ids ?? [];
      setStamps(prev => reset ? newStamps : [...prev, ...newStamps]);
      setCursor(stampsRes.data.nextCursor);
      setHasMore(!!stampsRes.data.nextCursor);
    } finally { setLoading(false); }
  }, [params.id, cursor, getToken]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      e => { if (e[0].isIntersecting && hasMore) load(); },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [load, hasMore]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    await clientApi.patch(`/api/albums/${params.id}`, { name: newName });
    setAlbum(prev => prev ? { ...prev, name: newName } : prev);
    setEditing(false);
  }

  async function handleRemoveStamp(stampId: string) {
    await clientApi.delete(`/api/albums/${params.id}/stamps/${stampId}`);
    setStamps(prev => prev.filter(s => s.id !== stampId));
  }

  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      <Link href="/home" style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-muted)', marginBottom: 'var(--space-lg)', display: 'inline-block' }}>
        ← Collection
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {editing ? (
          <form onSubmit={handleRename} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              maxLength={80}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>Save</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: 0 }}>
              {album?.name ?? '…'}
            </h1>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-muted)' }}>
              {album?._count.stamps ?? 0} stamps
            </span>
            {album && (
              <button
                className="btn btn-ghost"
                onClick={() => { setNewName(album.name); setEditing(true); }}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                ✏ Rename
              </button>
            )}
          </>
        )}
      </div>

      {/* Grid */}
      {stamps.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
          No stamps in this album yet. Add some from a stamp's detail page.
        </div>
      ) : (
        <div className="stamp-grid">
          {stamps.map(stamp => (
            <div key={stamp.id} style={{ position: 'relative' }}>
              <Link href={`/stamp/${stamp.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <StampCard
                  imageUrl={stamp.imageUrl}
                  imageAlt={stamp.caption ?? 'Stamp'}
                  caption={stamp.caption ?? undefined}
                  locationName={stamp.locationName ?? undefined}
                  date={new Date(stamp.takenAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })}
                />
              </Link>
              {/* Remove from album */}
              <button
                onClick={() => handleRemoveStamp(stamp.id)}
                title="Remove from album"
                style={{
                  position: 'absolute', top: 4, right: 4,
                  background: 'rgba(26,26,26,0.6)', border: 'none',
                  borderRadius: '50%', width: 24, height: 24,
                  cursor: 'pointer', color: '#fff', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
          Loading…
        </div>
      )}
    </div>
  );
}
