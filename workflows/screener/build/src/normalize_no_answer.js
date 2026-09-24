// GHL "Call No Answer" screener branch (tag wavv-no-answer / wavv-canceled on a contact tagged
// screening). The standard GHL contact payload: only contact_id matters. There is no call id, so
// the dedupe is a short time window (Attempt Dedupe).
const b = ($json && $json.body) ? $json.body : $json;
const cd = b.customData || {};
const now = Date.now();
const contact_id = String(b.contact_id || cd.contact_id || '').trim();
return { json: {
  contact_id, event: 'no-answer', wavv_call_id: '',
  event_key: 'na:' + contact_id + ':' + now,
  at_ms: now, received_at: new Date(now).toISOString()
}};
