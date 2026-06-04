/**
 * Cursor-based pagination helper.
 * Encodes/decodes the cursor as base64(timestamp+id).
 */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString(
    'base64url'
  );
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const { createdAt, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return { createdAt: new Date(createdAt), id };
  } catch {
    return null;
  }
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export function parseLimit(raw?: string | number): number {
  const n = Number(raw ?? DEFAULT_PAGE_SIZE);
  return Math.min(isNaN(n) || n < 1 ? DEFAULT_PAGE_SIZE : n, MAX_PAGE_SIZE);
}
