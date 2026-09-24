import { getSql, type Env } from '../../_shared/db';
import { cachedJsonResponse } from '../../_shared/http';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const sql = getSql(env);
  const rows = await sql`SELECT raw_data FROM bootstrap_snapshots ORDER BY id DESC LIMIT 1`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ detail: 'bootstrap data has not been ingested' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return cachedJsonResponse(rows[0].raw_data, 'public, max-age=300, must-revalidate', request.headers.get('If-None-Match'));
};
