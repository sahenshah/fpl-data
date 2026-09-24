import { getSql, type Env } from '../../../../_shared/db';
import { cachedJsonResponse } from '../../../../_shared/http';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${FPL_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const sql = getSql(env);
  const teamId = Number(params.id);

  const currentEventRows = await sql`
    SELECT id FROM events WHERE is_current IS TRUE ORDER BY id DESC LIMIT 1
  `;
  const nextEventRows = await sql`
    SELECT id FROM events WHERE is_next IS TRUE ORDER BY id ASC LIMIT 1
  `;
  const gameweek: number | null = currentEventRows[0]?.id ?? nextEventRows[0]?.id ?? null;
  if (gameweek === null) {
    return new Response(JSON.stringify({ detail: 'current gameweek is unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [summary, transfers, history] = await Promise.all([
    fetchJson(`/entry/${teamId}/`),
    fetchJson(`/entry/${teamId}/transfers/`),
    fetchJson(`/entry/${teamId}/history/`),
  ]);

  const pickResults = await Promise.all(
    Array.from({ length: gameweek }, (_, index) => index + 1).map(async (gw) => {
      try {
        return { gameweek: gw, data: await fetchJson(`/entry/${teamId}/event/${gw}/picks/`) };
      } catch {
        return { gameweek: gw, data: null };
      }
    })
  );

  const value = {
    team: summary,
    transfers,
    history,
    picks: pickResults,
    fetched_at: new Date().toISOString(),
  };

  return cachedJsonResponse(value, 'private, max-age=300, must-revalidate', request.headers.get('If-None-Match'));
};
