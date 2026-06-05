'use client';

import { useState } from 'react';
import { useAlbums } from '@/hooks/useAlbums';
import { AlbumCard, AlbumModal } from '@/components/album/AlbumComponents';

export function AlbumsSection() {
  const { albums, loading, create, rename, remove } = useAlbums();

  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  async function handleCreate(name: string) {
    await create(name);
    setShowCreate(false);
  }

  async function handleRename(id: string, name: string) {
    await rename(id, name);
    setRenaming(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this album? Stamps will not be deleted.')) return;
    await remove(id);
  }

  return (
    <section style={{ marginBottom: 'var(--space-xl)' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>Albums</h2>
        <button
          className="btn btn-ghost"
          style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={() => setShowCreate(true)}
        >
          + New album
        </button>
      </div>

      {/* Album cards */}
      {loading && albums.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--color-muted)' }}>Loading…</p>
      ) : albums.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--color-muted)' }}>
          No albums yet. Create one to organise your stamps.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          {albums.map(album => (
            <AlbumCard
              key={album.id}
              album={album}
              onRename={(id, name) => setRenaming({ id, name })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <AlbumModal mode="create" onConfirm={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {renaming && (
        <AlbumModal
          mode="rename"
          initialName={renaming.name}
          onConfirm={name => handleRename(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      )}
    </section>
  );
}
