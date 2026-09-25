// The Supabase write failed (after its retries): keep the payload in screener_log_pending so
// Screener: Log Retry can replay it into Supabase alone, never repeating a GHL write (codex review,
// 2026-09-25). One pending row per payload version; the versioned upsert makes a late replay harmless.
const row = $('Build Log Row').first().json.row;
const res = $input.first().json || {};
const err = res.error ? (res.error.message || JSON.stringify(res.error)) : 'unknown error';
return [{ json: {
  pending_key: row.event_key + '@' + row.decided_ms,
  event_key: row.event_key,
  row_json: JSON.stringify(row),
  error: String(err).slice(0, 500),
  queued_at: new Date().toISOString()
} }];
