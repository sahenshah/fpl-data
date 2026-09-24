import { getSql, type Env } from '../../../../_shared/db';

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const sql = getSql(env);
  const playerId = Number(params.id);
  const rows = await sql`
    SELECT raw_data FROM player_gameweek_stats
    WHERE player_id = ${playerId}
    ORDER BY gameweek, fixture_id
  `;
  return new Response(JSON.stringify({ history: rows.map((row: any) => row.raw_data) }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
