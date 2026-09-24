import type { Element, Fixture, Team } from '../types/fpl';

type Event = {
  id: number;
  name: string;
  deadline_time: string | null;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  [key: string]: unknown;
};

export type Prediction = {
  player_id: number;
  web_name: string;
  team_id: number;
  event_id: number;
  predicted_points: number;
  predicted_minutes: number | null;
};

export type DashboardData = {
  bootstrap: {
    teams: Team[];
    elements: Element[];
    events: Event[];
    [key: string]: unknown;
  };
  fixtures: Fixture[];
  live: { elements: Array<{ id: number; stats: Record<string, unknown> }>; event: number | null };
  predictions: Prediction[];
  prediction_run: {
    id: number;
    model_name: string;
    model_version: string;
    metrics: Record<string, unknown>;
  } | null;
};

type CachedResponse<T> = {
  etag: string;
  data: T;
};

const dashboardCacheKey = 'fpl-iq-dashboard-cache';
let dashboardRequest: Promise<DashboardData> | null = null;
let dashboardData: DashboardData | null = null;
const playerHistoryRequests = new Map<number, Promise<{ history: Record<string, unknown>[] }>>();

async function fetchCached<T>(url: string, storageKey: string): Promise<T> {
  let cached: CachedResponse<T> | null = null;
  try {
    const cachedRaw = sessionStorage.getItem(storageKey);
    cached = cachedRaw ? (JSON.parse(cachedRaw) as CachedResponse<T>) : null;
  } catch {
    // Browser storage is an optional optimization and may be unavailable or corrupted.
    cached = null;
  }
  const headers: HeadersInit = cached?.etag ? { 'If-None-Match': cached.etag } : {};
  const response = await fetch(url, { headers });

  if (response.status === 304 && cached) {
    return cached.data;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const data = (await response.json()) as T;
  const etag = response.headers.get('ETag');
  if (etag) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ etag, data } satisfies CachedResponse<T>));
    } catch {
      // Large dashboard payloads can exceed browser storage quotas. HTTP and backend
      // caching still apply, and the in-memory request cache handles this page load.
    }
  }
  return data;
}

function mergePredictions(data: DashboardData): DashboardData {
  const predictionsByPlayer = new Map<number, Prediction[]>();
  for (const prediction of data.predictions) {
    const playerPredictions = predictionsByPlayer.get(prediction.player_id) ?? [];
    playerPredictions.push(prediction);
    predictionsByPlayer.set(prediction.player_id, playerPredictions);
  }

  const upcomingGameweek =
    data.bootstrap.events.find((event) => event.is_next)?.id ??
    data.bootstrap.events.find((event) => event.is_current)?.id ??
    1;

  const elements = data.bootstrap.elements.map((player) => {
    const predictions = predictionsByPlayer.get(player.id);
    if (!predictions?.length) return player;
    // "next 4" means the next 4 gameweeks from here, not the first 4
    // predictions sorted ascending — those now include completed gameweeks
    // (GW1 cold-start plus the backfilled GW2-5 predictions), which would
    // otherwise dominate the sum for a player deep into the season.
    const upcoming = predictions
      .filter((prediction) => prediction.event_id >= upcomingGameweek)
      .sort((a, b) => a.event_id - b.event_id)
      .slice(0, 4);
    const predictionFields = Object.fromEntries(
      predictions.flatMap((prediction) => [
        [`pp_gw_${prediction.event_id}`, prediction.predicted_points],
        [`xmins_gw_${prediction.event_id}`, prediction.predicted_minutes],
      ])
    );
    const predictedPointsNext4 = upcoming.reduce((sum, prediction) => sum + prediction.predicted_points, 0);
    const predictedMinutesNext4 = upcoming.reduce((sum, prediction) => sum + (prediction.predicted_minutes ?? 0), 0);
    const costInMillions = player.now_cost / 10;
    return {
      ...player,
      ...predictionFields,
      predicted_points_next5: predictedPointsNext4,
      predicted_xmins_next5: predictedMinutesNext4,
      pp_next5_per_m: costInMillions > 0 ? predictedPointsNext4 / costInMillions : 0,
      pxm_next5_per_m: costInMillions > 0 ? predictedMinutesNext4 / costInMillions : 0,
    };
  });

  return { ...data, bootstrap: { ...data.bootstrap, elements } };
}

export function getDashboard(): Promise<DashboardData> {
  if (dashboardData) return Promise.resolve(dashboardData);
  if (!dashboardRequest) {
    dashboardRequest = fetchCached<DashboardData>('/api/v1/dashboard', dashboardCacheKey)
      .then(mergePredictions)
      .then((data) => {
        dashboardData = data;
        return data;
      })
      .finally(() => {
        dashboardRequest = null;
      });
  }
  return dashboardRequest;
}

export async function getManagerSnapshot(teamId: string): Promise<unknown> {
  return fetchCached(`/api/v1/managers/${encodeURIComponent(teamId)}/snapshot`, `fpl-iq-manager-${teamId}`);
}

export async function getPlayerHistory(playerId: number): Promise<{ history: Record<string, unknown>[] }> {
  const existing = playerHistoryRequests.get(playerId);
  if (existing) return existing;
  const request = fetch(`/api/v1/players/${playerId}/history`).then(async (response) => {
    if (!response.ok) throw new Error(`Failed to fetch player history: ${response.status}`);
    return response.json();
  });
  playerHistoryRequests.set(playerId, request);
  return request;
}

export async function getPlayerPastHistory(playerId: number): Promise<{ history_past: Record<string, unknown>[] }> {
  return fetch(`/api/v1/players/${playerId}/history/past`).then(async (response) => {
    if (!response.ok) throw new Error(`Failed to fetch player past history: ${response.status}`);
    return response.json();
  });
}

export function getCurrentGameweekFromDashboard(data: DashboardData): number | undefined {
  return data.bootstrap.events.find((event) => event.is_current)?.id;
}

export function getNextGameweekFromDashboard(data: DashboardData): number | undefined {
  return data.bootstrap.events.find((event) => event.is_next)?.id;
}
