import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import axios from 'axios';
import StampDetailClient from './StampDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface StampPageProps {
  params: { id: string };
}

// ── Fetch stamp (server-side, no auth — public route) ─────────────
async function getStamp(id: string, token: string | null) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const { data } = await axios.get(`${API_URL}/api/stamps/${id}`, { headers });
    return data.stamp;
  } catch {
    return null;
  }
}

// ── OG meta per stamp (TICKET-029) ────────────────────────────────
export async function generateMetadata({ params }: StampPageProps): Promise<Metadata> {
  const { getToken } = await auth();
  const token = await getToken();
  const stamp = await getStamp(params.id, token);
  if (!stamp) return { title: 'Stamp not found — StampHunter' };

  const title   = stamp.caption ?? `Stamp by ${stamp.user?.username ?? 'a collector'}`;
  const desc    = stamp.locationName
    ? `📍 ${stamp.locationName} · ${new Date(stamp.takenAt).toLocaleDateString()}`
    : `Collected on ${new Date(stamp.takenAt).toLocaleDateString()}`;

  return {
    title:       `${title} — StampHunter`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images:      stamp.framedUrl ?? stamp.imageUrl
        ? [{ url: stamp.framedUrl ?? stamp.imageUrl, width: 1200, height: 630 }]
        : [],
      type:        'article',
    },
    other: {
      // Deep-link for mobile app (TICKET-029)
      'al:ios:url':     `stamphunter://stamp/${params.id}`,
      'al:android:url': `stamphunter://stamp/${params.id}`,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────
export default async function StampPage({ params }: StampPageProps) {
  const { userId: clerkId, getToken } = await auth();
  const token = await getToken();
  const stamp = await getStamp(params.id, token);
  if (!stamp) notFound();

  // Private stamps only visible to their owner
  if (stamp.visibility === 'private') {
    // We don't have the DB userId here, so we'll let the client handle
    // the auth check. If unauthenticated → client will show 'not found'.
  }

  // Get current Clerk user ID to pass down for UI decisions
  let currentUserId: string | null = null;
  if (clerkId && token) {
    try {
      const { data } = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      currentUserId = data.user?.id ?? null;
    } catch {
      // Not fatal — currentUserId stays null
    }
  }

  return (
    <StampDetailClient
      stampId={params.id}
      currentUserId={currentUserId}
    />
  );
}
