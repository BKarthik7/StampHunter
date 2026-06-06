import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api';
import StampDetailClient from './StampDetailClient';

export const dynamic = 'force-dynamic';

interface StampPageProps {
  params: { id: string };
}

// ── Fetch stamp (server-side, using serverApi) ─────────────
async function getStamp(id: string) {
  try {
    const api = await serverApi();
    const { data } = await api.get(`/api/stamps/${id}`);
    return data.stamp;
  } catch (err: any) {
    console.error('[GET_STAMP_ERROR]', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    return null;
  }
}

// ── OG meta per stamp (TICKET-029) ────────────────────────────────
export async function generateMetadata({ params }: StampPageProps): Promise<Metadata> {
  const stamp = await getStamp(params.id);
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
  const stamp = await getStamp(params.id);
  if (!stamp) notFound();

  // Private stamps only visible to their owner
  if (stamp.visibility === 'private') {
    // We don't have the DB userId here, so we'll let the client handle
    // the auth check. If unauthenticated → client will show 'not found'.
  }

  // Get current Clerk user ID to pass down for UI decisions
  let currentUserId: string | null = null;
  try {
    const api = await serverApi();
    const { data } = await api.get(`/api/auth/me`);
    currentUserId = data.user?.id ?? null;
  } catch {
    // Not fatal — currentUserId stays null
  }

  return (
    <StampDetailClient
      stampId={params.id}
      currentUserId={currentUserId}
    />
  );
}
