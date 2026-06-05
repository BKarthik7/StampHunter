'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Album } from '@/hooks/useAlbums';

// ─── Album card ────────────────────────────────────────────────────
export function AlbumCard({
  album,
  onRename,
  onDelete,
}: {
  album:    Album;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const coverUrl = album.stamps?.[0]?.stamp?.imageUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Link
        href={`/album/${album.id}`}
        style={{
          display:       'block',
          width:         160,
          height:        200,
          background:    coverUrl ? `url(${coverUrl}) center/cover` : 'var(--color-paper-dark)',
          border:        '2px solid var(--color-ink)',
          borderRadius:  2,
          position:      'relative',
          overflow:      'hidden',
          transition:    'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform  = 'translateY(-3px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform  = 'none';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        {!coverUrl && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 40, opacity: 0.3 }}>📁</span>
          </div>
        )}
        {/* Stamp count badge */}
        <div style={{
          position:   'absolute', bottom: 6, right: 6,
          background: 'rgba(26,26,26,0.75)',
          borderRadius: 999, padding: '2px 8px',
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#fff' }}>
            {(album._count?.stamps ?? 0)} stamp{(album._count?.stamps ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </Link>

      {/* Name + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
          {album.name}
        </span>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => onRename(album.id, album.name)}
            title="Rename"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-muted)', padding: '2px 4px' }}
          >✏</button>
          <button
            onClick={() => onDelete(album.id)}
            title="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-error)', padding: '2px 4px' }}
          >🗑</button>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Rename modal ─────────────────────────────────────────
export function AlbumModal({
  mode,
  initialName = '',
  onConfirm,
  onClose,
}: {
  mode:         'create' | 'rename';
  initialName?: string;
  onConfirm:    (name: string) => void;
  onClose:      () => void;
}) {
  const [name,    setName]    = useState(initialName);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try { onConfirm(name.trim()); }
    finally { setLoading(false); }
  }

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-lg)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:   'var(--color-perforated)',
        border:       '1px solid var(--color-border)',
        borderRadius: 12,
        padding:      'var(--space-lg)',
        width:        '100%',
        maxWidth:     400,
        boxShadow:    '0 8px 32px rgba(0,0,0,0.16)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 'var(--space-md)' }}>
          {mode === 'create' ? 'New Album' : 'Rename Album'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <input
            ref={inputRef}
            className="input"
            placeholder="Album name…"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
          />
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || loading} style={{ flex: 2 }}>
              {loading ? 'Saving…' : mode === 'create' ? 'Create' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add-to-album picker modal ─────────────────────────────────────
export function AddToAlbumModal({
  albums,
  stampId,
  onAdd,
  onClose,
}: {
  albums:  Album[];
  stampId: string;
  onAdd:   (albumId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-lg)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-perforated)', border: '1px solid var(--color-border)',
        borderRadius: 12, padding: 'var(--space-lg)', width: '100%', maxWidth: 360,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)', maxHeight: '80vh', overflowY: 'auto',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 'var(--space-md)' }}>
          Add to Album
        </h2>
        {albums.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--color-muted)' }}>
            No albums yet. Create one from your collection.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {albums.map(a => (
              <button
                key={a.id}
                className="btn btn-ghost"
                disabled={loading === a.id}
                onClick={async () => {
                  setLoading(a.id);
                  try { await onAdd(a.id); onClose(); }
                  finally { setLoading(null); }
                }}
                style={{ justifyContent: 'space-between', textAlign: 'left' }}
              >
                <span>📁 {a.name}</span>
                <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>
                  {a._count.stamps} stamps
                </span>
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%', marginTop: 'var(--space-md)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
