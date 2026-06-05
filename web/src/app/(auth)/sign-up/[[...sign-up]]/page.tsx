import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="auth-logo">✉</span>
        <h1>StampHunter</h1>
        <p>Start your collection.</p>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorPrimary: '#C0392B',
            colorBackground: '#F7F4ED',
            colorInputBackground: '#FFFFFF',
            colorText: '#1A1A1A',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '6px',
          },
          elements: {
            card: 'clerk-card',
            formButtonPrimary: 'btn btn-primary',
          },
        }}
      />

      <style jsx global>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          background: var(--color-paper);
          padding: var(--space-xl);
        }
        .auth-brand { text-align: center; }
        .auth-logo { font-size: 48px; display: block; margin-bottom: 8px; }
        .auth-brand h1 {
          font-family: var(--font-display);
          font-size: 32px;
          color: var(--color-ink);
          margin-bottom: 4px;
        }
        .auth-brand p {
          font-family: var(--font-ui);
          font-size: 15px;
          color: var(--color-muted);
        }
        .cl-rootBox { width: 100%; max-width: 420px; }
        .cl-card { background: var(--color-perforated) !important; border: 1px solid var(--color-border) !important; box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important; }
      `}</style>
    </main>
  );
}
