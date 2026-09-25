// Pending screener_log payloads (a Supabase write that failed), oldest first. Each becomes one replay
// of the versioned upsert; a row whose JSON is unreadable is reported and left for a human.
return $input.all().map(i => i.json).filter(p => p && p.id && p.pending_key).map(p => {
  let row = null;
  try { row = JSON.parse(p.row_json); } catch (e) { row = null; }
  return { json: { id: p.id, pending_key: p.pending_key, body: row ? { r: row } : null, bad: !row } };
}).filter(i => !i.json.bad);
