'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { StampFrame } from '@/components/stamp/StampFrame';
import { StampPunchAnimation } from '@/components/stamp/StampPunchAnimation';
import { clientApi, setClientToken } from '@/lib/client-api';

type Step = 'pick' | 'preview' | 'form' | 'animating' | 'done';

export default function NewStampPage() {
  const router     = useRouter();
  const { getToken } = useAuth();

  const [step,          setStep]          = useState<Step>('pick');
  const [file,          setFile]          = useState<File | null>(null);
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [caption,       setCaption]       = useState('');
  const [tags,          setTags]          = useState('');
  const [visibility,    setVisibility]    = useState<'private' | 'public'>('private');
  const [isAnimating,   setIsAnimating]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  // ── Step 1: Pick photo ─────────────────────────────────────────
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep('preview');
  }

  // ── Step 2: Preview → Form ─────────────────────────────────────
  function handlePreviewContinue() { setStep('form'); }

  // ── Step 3: Submit → play animation → POST ─────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setStep('animating');
    setIsAnimating(true);
  }

  async function handleAnimationComplete() {
    // Animation finished — now hit the API
    try {
      const token = await getToken();
      setClientToken(token);

      const form = new FormData();
      form.append('image', file!);
      if (caption)    form.append('caption',    caption);
      if (tags)       form.append('tags',       tags);
      form.append('visibility', visibility);

      await clientApi.post('/api/stamps', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStep('done');
      setTimeout(() => router.push('/home'), 800);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Upload failed. Please try again.');
      setStep('form');
      setIsAnimating(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)', maxWidth: 520 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 'var(--space-lg)' }}>
        Stamp a Memory
      </h1>

      {/* ── STEP 1: Pick ── */}
      {step === 'pick' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border:         '2px dashed var(--color-border)',
            borderRadius:   8,
            padding:        'var(--space-xl)',
            textAlign:      'center',
            cursor:         'pointer',
            background:     'var(--color-paper-dark)',
            transition:     'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-postmark-blue)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>📷</span>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-ink)', marginBottom: 8 }}>
            Choose a photo
          </p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--color-muted)' }}>
            JPEG, PNG or WebP · max 20MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFilePick}
          />
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && previewUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <StampFrame imageUrl={previewUrl} imageAlt="Your stamp preview" size="card" />
          <div style={{ display: 'flex', gap: 'var(--space-sm)', width: '100%' }}>
            <button className="btn btn-ghost" onClick={() => setStep('pick')} style={{ flex: 1 }}>
              ← Change photo
            </button>
            <button className="btn btn-primary" onClick={handlePreviewContinue} style={{ flex: 2 }}>
              Looks good →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Form ── */}
      {step === 'form' && previewUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', alignItems: 'center' }}>
          <StampFrame imageUrl={previewUrl} imageAlt="Your stamp preview" size="card" caption={caption || undefined} />

          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {error && (
              <p style={{ color: 'var(--color-error)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
                {error}
              </p>
            )}

            <div>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Caption
              </label>
              <input
                className="input"
                type="text"
                placeholder="Add a caption…"
                maxLength={500}
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Tags <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(comma-separated)</span>
              </label>
              <input
                className="input"
                type="text"
                placeholder="travel, sunset, food…"
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>
                Visibility
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {(['private', 'public'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={visibility === v ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                  >
                    {v === 'private' ? '🔒 Private' : '🌍 Public'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep('preview')} style={{ flex: 1 }}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, fontSize: 15 }}>
                Stamp It ✉
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── STEP 4: Animation ── */}
      {(step === 'animating' || step === 'done') && previewUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <StampPunchAnimation
            isAnimating={isAnimating}
            onComplete={handleAnimationComplete}
            imageUrl={previewUrl}
            imageAlt="Stamping…"
            caption={caption || undefined}
            size="card"
            frameWidth={400}
          />
        </div>
      )}
    </div>
  );
}
