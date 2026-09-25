// One screener_log row in Supabase (spec §10.2 item 7a) for an unanswered dial: no-answer, voicemail
// or bad number. Same event_key as its screener_attempts row, so a replayed event updates it. Only a
// screening lead is logged; a contact that could not be read is retried by the event itself.
const r = $('Log Row').first().json;
const got = (() => { try { return $('GHL: Get Contact').first().json; } catch (e) { return null; } })();
const contact = (got && got.contact) || null;
const s = v => String(v == null ? '' : v).trim();
const num = x => (x === '' || x == null || isNaN(Number(x))) ? undefined : Number(x);
if (!contact || !contact.id) return [{ json: { log: false, why: 'contact not read' } }];
if (!(contact.tags || []).map(t => s(t).toLowerCase()).includes('screening')) return [{ json: { log: false, why: 'not a screening lead' } }];
const at = num(r.at_ms);
return [{ json: { log: true, row: {
  event_key: s(r.event_key), event: s(r.event),
  event_at: new Date(at !== undefined ? at : Date.now()).toISOString(),
  ghl_contact_id: s(r.contact_id),
  company: s(contact.companyName) || undefined,
  attempt_no: num(r.attempt_no),
  result_stage: s(r.result_stage) || null,
  reason: s(r.reason) || null,
  decided_ms: Date.now(),
  updated_at: new Date().toISOString()
} } }];
