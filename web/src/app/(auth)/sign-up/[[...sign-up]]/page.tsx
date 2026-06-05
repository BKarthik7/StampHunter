'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      background: 'var(--color-paper)',
      padding: 'var(--space-xl)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>✉</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--color-ink)', marginBottom: 4 }}>
          StampHunter
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--color-muted)' }}>
          Start your collection.
        </p>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorPrimary:        '#C0392B',
            colorBackground:     '#F7F4ED',
            colorInputBackground:'#FFFFFF',
            colorText:           '#1A1A1A',
            fontFamily:          'Inter, system-ui, sans-serif',
            borderRadius:        '6px',
          },
          elements: {
            card:              'clerk-card',
            formButtonPrimary: 'btn btn-primary',
          },
        }}
      />
    </main>
  );
}
