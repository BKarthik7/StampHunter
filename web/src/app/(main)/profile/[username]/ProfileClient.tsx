'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { StampCard } from '@/components/stamp/StampCard';
import { clientApi, setClientToken } from '@/lib/client-api';

interface User {
  id:             string;
  username:       string;
  displayName:    string | null;
  bio:            string | null;
  avatarUrl:      string | null;
  isVerified:     boolean;
  stampCount:     number;
  followerCount:  number;
  followingCount: number;
}

interface Stamp {
  id: string; imageUrl: string; caption: string | null;
  locationName: string | null; takenAt: string; tags: { tag: string }[];
}

export default function ProfileClient({ user }: { user: User }) {
  const { getToken }   = useAuth();
  const { user: self } = useUser();
  const isOwnProfile   = self?.username === user.username;

  const [stamps,    setStamps]    = useState<Stamp[]>([]);
  const [cursor,    setCursor]    = useState<string | null>(null);
  const [hasMore,   setHasMore]   = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [following, setFollowing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadStamps = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    const token = await getToken();
    setClientToken(token);
    try {
      const { data } = await clientApi.get(`/api/users/${user.username}/stamps`, {
        params: { limit: 20, ...(!reset && cursor ? { cursor } : {}) },
      });
      setStamps(prev => reset ? data.stamps : [...prev, ...data.stamps]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally { setLoading(false); }
  }, [user.username, cursor, loading, getToken]);

  useEffect(() => { loadStamps(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      e => { if (e[0].isIntersecting && hasMore) loadStamps(); },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadStamps, hasMore]);

  async function toggleFollow() {
    const next = !following;
    setFollowing(next);
    try {
      if (next) await clientApi.post(`/api/users/${user.username}/follow`);
      else      await clientApi.delete(`/api/users/${user.username}/follow`);
    } catch { setFollowing(!next); }
  }

  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      {/* ── Profile header ── */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        gap:            'var(--space-lg)',
        marginBottom:   'var(--space-xl)',
        flexWrap:       'wrap',
      }}>
        {/* Avatar */}
        <div style={{
          width:        96,
          height:       96,
          borderRadius: '50%',
          background:   'var(--color-paper-dark)',
          border:       '2px solid var(--color-border)',
          overflow:     'hidden',
          flexShrink:   0,
        }}>
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: 0 }}>
              {user.displayName ?? user.username}
              {user.isVerified && <span title="Verified" style={{ marginLeft: 6, fontSize: 16 }}>✓</span>}
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--color-muted)', margin: '0 0 12px' }}>
            @{user.username}
          </p>
          {user.bio && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--color-ink)', margin: '0 0 12px', maxWidth: 400 }}>
              {user.bio}
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
            {[
              { label: 'Stamps',    value: user.stampCount },
              { label: 'Followers', value: user.followerCount },
              { label: 'Following', value: user.followingCount },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                  {s.value}
                </p>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Follow button — only shown on other profiles */}
          {!isOwnProfile && self && (
            <button
              onClick={toggleFollow}
              className={following ? 'btn btn-ghost' : 'btn btn-secondary'}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          {isOwnProfile && (
            <Link href="/home" className="btn btn-ghost" style={{ display: 'inline-flex' }}>
              ← My Collection
            </Link>
          )}
        </div>
      </div>

      {/* ── Stamp grid ── */}
      <div className="stamp-grid">
        {stamps.map(stamp => (
          <Link key={stamp.id} href={`/stamp/${stamp.id}`} style={{ textDecoration: 'none' }}>
            <StampCard
              imageUrl={stamp.imageUrl}
              imageAlt={stamp.caption ?? 'Stamp'}
              caption={stamp.caption ?? undefined}
              locationName={stamp.locationName ?? undefined}
              date={new Date(stamp.takenAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
            />
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
          Loading…
        </div>
      )}
    </div>
  );
}
