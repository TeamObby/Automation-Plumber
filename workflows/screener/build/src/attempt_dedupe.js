// Once per dial. The input is the contact's recent screener_attempts rows ({} when none).
//  - a WAVV note carries its call id: a replay finds its own row -> stop if it was written back,
//    or retry with the SAME attempt number if it was not (never counted twice);
//  - a no-answer tag event has no id: a second no-answer for the contact within WINDOW_MS is the
//    same dial delivered twice (a real redial takes longer than one ring cycle).
const WINDOW_MS = 30 * 1000;
const e = $('Event').first().json;
const rows = $input.all().map(i => i.json).filter(r => r && r.event_key);
let route = 'count', stored_attempt_no = null, reason = '';
const same = e.event_key && e.event_key.startsWith('wavv:') ? rows.find(r => r.event_key === e.event_key) : null;
if (same) {
  if (same.ok === true) { route = 'duplicate'; reason = 'this WAVV call was already counted'; }
  else { stored_attempt_no = Number(same.attempt_no) || null; reason = 'retrying an event whose write-back failed'; }
} else if (e.event === 'no-answer') {
  const recent = rows.find(r => r.event === 'no-answer' && Number(r.at_ms) > e.at_ms - WINDOW_MS && Number(r.at_ms) <= e.at_ms);
  if (recent) { route = 'duplicate'; reason = 'no-answer for this contact ' + Math.round((e.at_ms - recent.at_ms) / 1000) + 's ago'; }
}
return [{ json: Object.assign({}, e, { route, stored_attempt_no, dedupe_reason: reason }) }];
