// Mirrors the Python stub in fpl_iq/api.py — always returns an empty
// history_past list, ported as-is rather than expanded.
export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ history_past: [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
