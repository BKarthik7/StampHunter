import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import axios from 'axios';
import ProfileClient from './ProfileClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props { params: { username: string } }

async function getUser(username: string) {
  try {
    const { data } = await axios.get(`${API_URL}/api/users/${username}`);
    return data.user;
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUser(params.username);
  if (!user) return { title: 'Profile not found — StampHunter' };
  return {
    title: `${user.displayName ?? user.username} (@${user.username}) — StampHunter`,
    description: user.bio ?? `${user.stampCount} stamps collected on StampHunter.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const user = await getUser(params.username);
  if (!user) notFound();
  return <ProfileClient user={user} />;
}
