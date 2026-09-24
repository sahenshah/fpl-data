import { getSql, toNumberOrNull, type Env } from '../../_shared/db';
import { cachedJsonResponse } from '../../_shared/http';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const sql = getSql(env);

  const snapshotRows = await sql`SELECT raw_data FROM bootstrap_snapshots ORDER BY id DESC LIMIT 1`;
  if (snapshotRows.length === 0) {
    return new Response(JSON.stringify({ detail: 'bootstrap data has not been ingested' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fixtureRows = await sql`SELECT raw_data FROM fixtures ORDER BY id`;
  const currentEventRows = await sql`SELECT id FROM events WHERE is_current IS TRUE LIMIT 1`;
  const currentEventId: number | null = currentEventRows[0]?.id ?? null;

  let liveElements: Array<{ id: number; stats: unknown }> = [];
  if (currentEventId !== null) {
    const liveRows = await sql`
      SELECT player_id, raw_data FROM player_gameweek_stats WHERE gameweek = ${currentEventId}
    `;
    liveElements = liveRows.map((row: any) => ({ id: row.player_id, stats: row.raw_data }));
  }

  const runRows = await sql`
    SELECT id, model_name, model_version, metrics FROM prediction_runs ORDER BY id DESC LIMIT 1
  `;
  const run = runRows[0] ?? null;

  let predictions: Array<Record<string, unknown>> = [];
  if (run) {
    const predictionRows = await sql`
      SELECT pp.player_id, p.web_name, p.team_id, pp.event_id, pp.predicted_points, pp.predicted_minutes
      FROM player_predictions pp
      JOIN players p ON p.id = pp.player_id
      WHERE pp.prediction_run_id = ${run.id}
    `;
    predictions = predictionRows.map((row: any) => ({
      player_id: row.player_id,
      web_name: row.web_name,
      team_id: row.team_id,
      event_id: row.event_id,
      predicted_points: toNumberOrNull(row.predicted_points),
      predicted_minutes: toNumberOrNull(row.predicted_minutes),
    }));
  }

  const value = {
    bootstrap: snapshotRows[0].raw_data,
    fixtures: fixtureRows.map((row: any) => row.raw_data),
    live: { elements: liveElements, event: currentEventId },
    predictions,
    prediction_run: run
      ? { id: run.id, model_name: run.model_name, model_version: run.model_version, metrics: run.metrics }
      : null,
  };

  return cachedJsonResponse(value, 'public, max-age=300, must-revalidate', request.headers.get('If-None-Match'));
};
