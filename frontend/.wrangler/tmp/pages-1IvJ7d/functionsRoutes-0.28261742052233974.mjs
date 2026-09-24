import { onRequestGet as __api_v1_players__id__history_past_ts_onRequestGet } from "/home/sahen/fpl-data/frontend/functions/api/v1/players/[id]/history/past.ts"
import { onRequestGet as __api_v1_managers__id__snapshot_ts_onRequestGet } from "/home/sahen/fpl-data/frontend/functions/api/v1/managers/[id]/snapshot.ts"
import { onRequestGet as __api_v1_players__id__history_ts_onRequestGet } from "/home/sahen/fpl-data/frontend/functions/api/v1/players/[id]/history.ts"
import { onRequestGet as __api_v1_bootstrap_ts_onRequestGet } from "/home/sahen/fpl-data/frontend/functions/api/v1/bootstrap.ts"
import { onRequestGet as __api_v1_dashboard_ts_onRequestGet } from "/home/sahen/fpl-data/frontend/functions/api/v1/dashboard.ts"

export const routes = [
    {
      routePath: "/api/v1/players/:id/history/past",
      mountPath: "/api/v1/players/:id/history",
      method: "GET",
      middlewares: [],
      modules: [__api_v1_players__id__history_past_ts_onRequestGet],
    },
  {
      routePath: "/api/v1/managers/:id/snapshot",
      mountPath: "/api/v1/managers/:id",
      method: "GET",
      middlewares: [],
      modules: [__api_v1_managers__id__snapshot_ts_onRequestGet],
    },
  {
      routePath: "/api/v1/players/:id/history",
      mountPath: "/api/v1/players/:id",
      method: "GET",
      middlewares: [],
      modules: [__api_v1_players__id__history_ts_onRequestGet],
    },
  {
      routePath: "/api/v1/bootstrap",
      mountPath: "/api/v1",
      method: "GET",
      middlewares: [],
      modules: [__api_v1_bootstrap_ts_onRequestGet],
    },
  {
      routePath: "/api/v1/dashboard",
      mountPath: "/api/v1",
      method: "GET",
      middlewares: [],
      modules: [__api_v1_dashboard_ts_onRequestGet],
    },
  ]