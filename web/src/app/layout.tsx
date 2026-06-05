import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'StampHunter — Stamp Your Memories',
  description:
    'Capture photo memories as postal stamps. Collect, share, and explore moments from around the world.',
  openGraph: {
    siteName: 'StampHunter',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
