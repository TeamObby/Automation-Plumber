// GHL "Contact Changed → Screener Outcome" webhook. Only the contact id matters: the compare step
// re-reads the mark from the contact, so a stale or reordered webhook cannot apply an old value.
const b = ($json && $json.body) ? $json.body : $json;
const cd = b.customData || {};
const s = v => String(v == null ? '' : v).trim();
return { json: {
  contact_id: s(cd.contact_id || b.contact_id || b.id),
  mark_in_payload: s(cd.screener_outcome || b.screener_outcome),
  received_at: new Date().toISOString()
}};
