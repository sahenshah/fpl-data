import { neon } from '@neondatabase/serverless';

export interface Env {
  DATABASE_URL: string;
}

export function getSql(env: Env) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(env.DATABASE_URL);
}

// The Neon driver returns Postgres `numeric` columns as strings (to avoid
// silent precision loss) — the Python API returned them as JSON numbers via
// `float(...)`, so convert the same way here to keep the response shape
// identical for the frontend.
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}
