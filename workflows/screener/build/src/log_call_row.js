// One screener_log row in Supabase (spec §10.2 item 7a) for the answered call this compare run was
// about. Upserted on event_key, so every run for the call (AI first, mark later, retries) updates the
// same row. The decision fields are always sent (null = not decided yet, so a waiting run never counts
// as a miss); call facts are sent only when known, so a run that lacks them never blanks them.
const VERDICT = 'boOwqb5qGOmbWBopWvTv', ATTEMPTS = 'vcqKnq23gN5wIIHqRww4';
const NOISE = { 'Owner - Busy': 'busy', 'Owner - Quiet': 'quiet' };
const plan = $('Decide').first().json;
const input = $('When Called by Screener').first().json;
const contact = (($('GHL: Get Contact').first().json || {}).contact) || {};
const found = (() => { try { return $('Find call row').first().json || {}; } catch (e) { return {}; } })();
const s = v => String(v == null ? '' : v).trim();
const parse = raw => { try { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
const cf = id => { const f = (contact.customFields || []).find(x => x.id === id); return f ? f.value : undefined; };
const num = x => (x === '' || x == null || isNaN(Number(x))) ? undefined : Number(x);
const known = x => s(x) || undefined;
const bool = (...xs) => xs.find(x => typeof x === 'boolean');

const cid = s(plan.verdict_call_id) || s(plan.call_id);
if (plan.action === 'skip') return [{ json: { log: false, why: 'skipped run: ' + s(plan.reason) } }];
if (!cid) return [{ json: { log: false, why: 'no call yet (marked before the call was captured)' } }];
const call = s(found.call_id) === cid ? found : {};   // lookup missed: use the verdict only
const v = [parse(input.verdict_json), parse(cf(VERDICT))].find(x => x && s(x.call_id) === cid) || {};
const decided = plan.action === 'apply';
return [{ json: { log: true, row: {
  event_key: 'call:' + cid, event: 'call',
  event_at: known(call.answered_at) || known(v.answered_at) || new Date().toISOString(),
  ghl_contact_id: s(plan.contact_id),
  company: known(contact.companyName),
  screener_user_id: known(call.ghl_user_id) || known(v.ghl_user_id),
  attempt_no: num(cf(ATTEMPTS)),
  duration_sec: num(call.duration_sec),
  pt_block: known(call.pt_block) || known(v.pt_block),
  screener_outcome: s(plan.mark) || null,
  noise: NOISE[s(plan.mark)] || null,
  ai_call_outcome: known(call.ai_call_outcome) || known(v.call_outcome),
  ai_owner_reached: known(call.ai_owner_reached) || known(v.owner_reached),
  ai_confidence: num(call.ai_confidence) !== undefined ? num(call.ai_confidence) : num(v.confidence),
  ai_quote_verified: bool(call.ai_quote_verified, v.quote_verified),
  // A dead-end mark (Wrong Number, Not A Plumber, Do Not Call) is never compared with the AI: no match value.
  match: decided && plan.result !== 'Disqualified' ? !plan.mismatch : null,
  result_stage: s(plan.result) || null,
  reason: [plan.reason].concat(plan.notes || []).filter(Boolean).join(' | ') || null,
  call_id: cid,
  recording_url: known(call.recording_url),
  transcript: known(call.transcript),
  updated_at: new Date().toISOString()
} } }];
