export default function HomePage() {
  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>Your Collection</h2>
      </div>

      {/* Empty state — replaced by StampGrid once stamps load (TICKET-017) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        gap: 'var(--space-md)',
        color: 'var(--color-muted)',
      }}>
        <span style={{ fontSize: 64 }}>✉</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--color-ink)' }}>
          Your archive awaits.
        </h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, textAlign: 'center', maxWidth: 340 }}>
          Tap <strong style={{ color: 'var(--color-stamp-red)' }}>+ Stamp</strong> in the nav to capture your first memory.
        </p>
      </div>
    </div>
  );
}
