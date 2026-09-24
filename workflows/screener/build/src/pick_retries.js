// Rows whose GHL write-back did not finish (writeback_ok = false). Retry each contact's NEWEST
// call once per sweep; older calls of the same contact are superseded by it. After 48 h a row is
// left for a human (it stays writeback_ok = false and shows in the daily summary, item 7).
const MAX_AGE_MS = 48 * 3600 * 1000;
const now = Date.now();
const newest = {};
for (const { json: r } of $input.all()) {
  if (!r || !r.call_id || !r.contact_id || r.ai_ok !== true || r.writeback_ok !== false) continue;
  if (now - Date.parse(r.received_at) > MAX_AGE_MS) continue;
  const cur = newest[r.contact_id];
  if (!cur || Date.parse(r.answered_at) > Date.parse(cur.answered_at)) newest[r.contact_id] = r;
}
return Object.values(newest).map(r => ({ json: r }));
