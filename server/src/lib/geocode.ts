import { env } from '../config/env.js';

interface NominatimResponse {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Reverse geocode GPS coordinates to a human-readable location name.
 * Uses OpenStreetMap Nominatim — completely free, no API key needed.
 * Failure is silent — stamp saves without location_name.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': env.NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) return null;

    const data = (await res.json()) as NominatimResponse;

    // Build a human-readable name like "Koramangala, Bengaluru"
    const addr = data.address;
    if (!addr) return data.display_name?.split(',').slice(0, 2).join(',').trim() ?? null;

    const parts = [
      addr.neighbourhood ?? addr.suburb ?? addr.village ?? addr.town,
      addr.city ?? addr.town ?? addr.county,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  } catch {
    // Timeout, network error, etc. — non-fatal
    return null;
  }
}
