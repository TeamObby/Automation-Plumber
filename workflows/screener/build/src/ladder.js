// The Attempt ladder (spec §2.1, §9 events 3+4). A stage is the call that is DUE: after dial n the
// lead is in Attempt n+1, and after the 4th unanswered dial it leaves the queue as Exhausted.
// Bad Number -> Disqualified. Screen Attempts is SET to the event's attempt number (never +1 on
// the stored value), so a retried event lands on the same number.
const PIPELINE = 'CvDwpavqkHSRhg5Bn3L4';
const LADDER = ['7ff9193f-1e0a-4c93-9626-a6aab22b666b', 'd3d8862e-bc2e-443f-97e6-f77e577ac09e',
  'abb54fb0-dbfc-44d9-aa21-796b91b7540b', 'ec53d2ba-8322-45d6-9d60-283cc4fc016e'];   // Attempt 1..4
const EXHAUSTED = 'c1db8172-84bf-45a1-8f0e-5625157574a5';
const DISQUALIFIED = '65f9e1b4-8688-456d-845e-ebe0781101b9';
const NAMES = { [EXHAUSTED]: 'Exhausted', [DISQUALIFIED]: 'Disqualified' };
LADDER.forEach((id, i) => { NAMES[id] = 'Attempt ' + (i + 1); });
const TERMINAL = { 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f': 'Owner Verified', 'f83777fa-1dc0-4163-aa84-ef501126d82b': 'Gatekeeper',
  '0c160182-e74d-4ace-9d3b-c4404043ef4b': 'Not Sure', [EXHAUSTED]: 'Exhausted', [DISQUALIFIED]: 'Disqualified' };
const F = { outcome: 'iTZa77JWntQs2QBuo9QU', date: 'MUkHW8R17PIksrSnpz6g', attempts: 'vcqKnq23gN5wIIHqRww4', verdict: 'boOwqb5qGOmbWBopWvTv' };
const NOT_A_PERSON = ['voicemail', 'no_conversation'];   // AI verdicts that are not an answered human
const GHL = 'https://services.leadconnectorhq.com';

const e = $('Attempt Dedupe').first().json;
const got = $('GHL: Get Contact').first().json;
const found = $('GHL: Find Screener Opp').first().json;
const contact = (got && got.contact) || null;
const s = v => String(v == null ? '' : v).trim();
const out = (action, reason, extra) => ({ json: Object.assign({
  contact_id: e.contact_id, event: e.event, event_key: e.event_key, wavv_call_id: e.wavv_call_id, at_ms: e.at_ms,
  received_at: e.received_at, action, reason, attempt_no: e.stored_attempt_no || null, result_stage: '', retry: false, force_compare: false, ops: []
}, extra) });

if (!contact || !contact.id) return out('skip', 'contact not readable: ' + s(got && got.error && (got.error.description || got.error.message)), { retry: true });
const tags = (contact.tags || []).map(t => s(t).toLowerCase());
if (!tags.includes('screening')) return out('skip', 'contact is not tagged screening');
const cf = id => { const f = (contact.customFields || []).find(x => x.id === id); return f ? f.value : undefined; };
const parse = raw => { try { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return v && typeof v === 'object' ? v : null; } catch (err) { return null; } };

const opps = ((found && found.opportunities) || []).filter(o => o.pipelineId === PIPELINE && (o.status || 'open') === 'open');
const opp = opps[0] || null;
if (!opp && found && found.error) return out('skip', 'opportunity search failed', { retry: true });

const attempt_no = e.stored_attempt_no || (Number(cf(F.attempts)) || 0) + 1;
const ops = [];
const op = (label, method, url, body) => ops.push({ label, method, url, body });
op('Screen Attempts = ' + attempt_no, 'PUT', GHL + '/contacts/' + e.contact_id, { customFields: [ { id: F.attempts, value: attempt_no } ] });

// Lead already decided (an answered call, or a terminal stage). A NEW event leaves it alone. A RETRY
// of an event that half-failed (codex review) still repairs its count, but never moves the stage:
// whatever put the lead in a terminal stage since may be newer than this event.
const decided = s(cf(F.date)) ? 'already screened (an answered call decided this lead)'
  : (opp && TERMINAL[opp.pipelineStageId] ? 'opportunity already in ' + TERMINAL[opp.pipelineStageId] : '');
if (decided && e.stored_attempt_no) return out('repair', 'retry: Screen Attempts repaired, stage left — ' + decided, { attempt_no, ops });
if (decided) return out('skip', decided);

// Bad Number is a dead end whatever came before (codex review): it wins over the unmarked-call case.
// An answered human call that the screener never marked: this dial is "the next call", so the
// compare runs now with nothing marked -> Not Sure + screen-mismatch (spec §4.1). It owns the stage.
const verdict = parse(cf(F.verdict));
if (e.event !== 'bad-number' && verdict && !s(cf(F.outcome)) && !NOT_A_PERSON.includes(s(verdict.call_outcome))) {
  return out('force', 'previous answered call was never marked', { attempt_no, ops, force_compare: true });
}

const stage = e.event === 'bad-number' ? DISQUALIFIED : (attempt_no >= LADDER.length ? EXHAUSTED : LADDER[attempt_no]);
if (!opp) return out('apply', 'no open Screener — Plumbers opportunity: only Screen Attempts written', { attempt_no, ops });
op('move stage -> ' + NAMES[stage], 'PUT', GHL + '/opportunities/' + opp.id, { pipelineId: PIPELINE, pipelineStageId: stage });
return out('apply', e.event + ' #' + attempt_no, { attempt_no, result_stage: NAMES[stage], ops });
