import axios from 'axios';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Server-side API client — uses Clerk session token automatically.
 * Use this in Server Components and Route Handlers.
 */
export async function serverApi() {
  const { getToken } = await auth();
  const token = await getToken();

  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Client-side API base URL (used in Client Components with useAuth).
 */
export const API_BASE = API_URL;
