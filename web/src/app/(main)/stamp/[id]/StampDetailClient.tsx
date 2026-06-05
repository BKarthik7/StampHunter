'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StampFrame } from '@/components/stamp/StampFrame';
import { clientApi, setClientToken } from '@/lib/client-api';

interface Stamp {
  id:           string;
  imageUrl:     string;
  caption:      string | null;
  locationName: string | null;
  takenAt:      string;
  visibility:   'private' | 'public';
  tags:         { tag: string }[];
  user:         { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  _count:       { likes: number; comments: number };
}

interface Comment {
  id:        string;
  body:      string;
  createdAt: string;
  user:      { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

export default function StampDetailClient({
  stampId,
  currentUserId,
}: {
  stampId:       string;
  currentUserId: string | null;
}) {
  const { getToken } = useAuth();
  const router       = useRouter();

  const [stamp,       setStamp]       = useState<Stamp | null>(null);
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(0);
  const [commentText, setCommentText] = useState('');
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editTags,    setEditTags]    = useState('');
  const [editVis,     setEditVis]     = useState<'private' | 'public'>('private');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const isOwner = stamp?.user.id === currentUserId;

  useEffect(() => {
    async function load() {
      const token = await getToken();
      setClientToken(token);
      try {
        const [stampRes, commentRes] = await Promise.all([
          clientApi.get(`/api/stamps/${stampId}`),
          clientApi.get(`/api/stamps/${stampId}/comments`, { params: { limit: 20 } }),
        ]);
        setStamp(stampRes.data.stamp);
        setLikeCount(stampRes.data.stamp._count.likes);
        setComments(commentRes.data.comments);
      } catch {
        setError('Stamp not found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [stampId, getToken]);

  // ── Like / Unlike ─────────────────────────────────────────────
  async function handleLike() {
    if (!currentUserId) { router.push('/sign-in'); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount(c => next ? c + 1 : c - 1);
    try {
      if (next) await clientApi.post(`/api/stamps/${stampId}/like`);
      else      await clientApi.delete(`/api/stamps/${stampId}/like`);
    } catch { setLiked(!next); setLikeCount(c => next ? c - 1 : c + 1); }
  }

  // ── Comment ───────────────────────────────────────────────────
  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await clientApi.post(`/api/stamps/${stampId}/comments`, { body: commentText });
      setComments(prev => [data.comment, ...prev]);
      setCommentText('');
    } finally { setSubmitting(false); }
  }

  // ── Delete comment ────────────────────────────────────────────
  async function handleDeleteComment(commentId: string) {
    await clientApi.delete(`/api/comments/${commentId}`);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  // ── Edit ──────────────────────────────────────────────────────
  function startEdit() {
    if (!stamp) return;
    setEditCaption(stamp.caption ?? '');
    setEditTags(stamp.tags.map(t => t.tag).join(', '));
    setEditVis(stamp.visibility);
    setEditing(true);
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const { data } = await clientApi.patch(`/api/stamps/${stampId}`, {
        caption:    editCaption || null,
        tags:       editTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        visibility: editVis,
      });
      setStamp(data.stamp);
      setEditing(false);
    } finally { setSubmitting(false); }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm('Delete this stamp? This cannot be undone.')) return;
    await clientApi.delete(`/api/stamps/${stampId}`);
    router.push('/home');
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
      Loading…
    </div>
  );
  if (error || !stamp) return (
    <div style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-muted)' }}>{error ?? 'Not found.'}</p>
      <Link href="/home" className="btn btn-ghost">← Back to collection</Link>
    </div>
  );

  const takenDate = new Date(stamp.takenAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      {/* Back */}
      <Link href="/home" style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-lg)' }}>
        ← Back
      </Link>

      <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* ── Left: Stamp ── */}
        <div style={{ flexShrink: 0 }}>
          <StampFrame
            imageUrl={stamp.imageUrl}
            imageAlt={stamp.caption ?? 'Stamp'}
            caption={stamp.caption ?? undefined}
            locationName={stamp.locationName ?? undefined}
            date={takenDate}
            size="detail"
          />
        </div>

        {/* ── Right: Meta + actions ── */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-paper-dark)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              {stamp.user.avatarUrl && <img src={stamp.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <Link href={`/profile/${stamp.user.username}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                {stamp.user.displayName ?? stamp.user.username}
              </Link>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
                {takenDate}{stamp.locationName ? ` · 📍 ${stamp.locationName}` : ''}
              </p>
            </div>
          </div>

          {/* Tags */}
          {stamp.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-md)' }}>
              {stamp.tags.map(t => <span key={t.tag} className="tag">{t.tag}</span>)}
            </div>
          )}

          {/* Visibility badge */}
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-muted)', marginBottom: 'var(--space-md)', display: 'block' }}>
            {stamp.visibility === 'private' ? '🔒 Private' : '🌍 Public'}
          </span>

          {/* Like button */}
          {!isOwner && currentUserId && (
            <button
              onClick={handleLike}
              className="btn btn-ghost"
              style={{
                color:       liked ? 'var(--color-stamp-red)' : 'var(--color-muted)',
                borderColor: liked ? 'var(--color-stamp-red-light)' : 'var(--color-border)',
                background:  liked ? 'var(--color-stamp-red-light)' : 'transparent',
                marginBottom: 'var(--space-md)',
              }}
            >
              {liked ? '♥' : '♡'} {likeCount}
            </button>
          )}
          {!currentUserId && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-muted)', marginBottom: 'var(--space-md)' }}>
              <Link href="/sign-in" style={{ color: 'var(--color-postmark-blue)' }}>Sign in</Link> to like and comment.
            </p>
          )}

          {/* Owner actions */}
          {isOwner && !editing && (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              <button className="btn btn-ghost" onClick={startEdit}>✏ Edit</button>
              <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                🗑 Delete
              </button>
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <input className="input" placeholder="Caption" value={editCaption} onChange={e => setEditCaption(e.target.value)} maxLength={500} />
              <input className="input" placeholder="Tags (comma-sep)" value={editTags} onChange={e => setEditTags(e.target.value)} />
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {(['private', 'public'] as const).map(v => (
                  <button key={v} className={editVis === v ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1 }} onClick={() => setEditVis(v)}>
                    {v === 'private' ? '🔒 Private' : '🌍 Public'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={submitting} style={{ flex: 2 }}>
                  {submitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--color-ink)' }}>
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </h2>

            {currentUserId && (
              <form onSubmit={handleComment} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                <input
                  className="input"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  maxLength={1000}
                />
                <button type="submit" className="btn btn-primary" disabled={submitting || !commentText.trim()} style={{ flexShrink: 0 }}>
                  Send
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-paper-dark)', flexShrink: 0, overflow: 'hidden' }}>
                    {c.user.avatarUrl && <img src={c.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                      {c.user.displayName ?? c.user.username}{' '}
                    </span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-ink)' }}>{c.body}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      {(c.user.id === currentUserId || isOwner) && (
                        <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-muted)', padding: 0 }}>
                          delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
