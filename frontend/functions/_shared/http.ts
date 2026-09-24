// Mirrors fpl_iq/api.py's `_etag`/`_cached_response` — the frontend's
// `fetchCached` already sends `If-None-Match` and expects a matching `304`.
export async function etagOf(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function cachedJsonResponse(
  value: unknown,
  cacheControl: string,
  ifNoneMatch: string | null
): Promise<Response> {
  const etag = await etagOf(value);
  const headers = {
    'Content-Type': 'application/json',
    'ETag': etag,
    'Cache-Control': cacheControl,
  };
  if (ifNoneMatch && ifNoneMatch.replace(/"/g, '') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(JSON.stringify(value), { status: 200, headers });
}
