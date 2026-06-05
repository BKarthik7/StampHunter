import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Client-side Axios instance.
 * Call setClientToken(token) once on mount (from useAuth hook).
 */
export const clientApi = axios.create({ baseURL: API_BASE });

export function setClientToken(token: string | null) {
  if (token) {
    clientApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete clientApi.defaults.headers.common['Authorization'];
  }
}
