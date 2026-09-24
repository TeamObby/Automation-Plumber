// The shared compare step (spec §4.1): the screener's mark meets the AI verdict, and this node
// decides the whole write-back as a list of GHL requests (ops). The nodes after it only execute.
// Called from Capture Call (a new AI verdict) and from Mark + Compare (the screener picked).
// Ordering: a new verdict is SAVED to the contact (GHL: Save Verdict) BEFORE the contact read this
// node uses, and GHL saves the screener's mark before firing its webhook. So whichever run reads
// second sees both values — two overlapping runs can never both 'wait'. If that save FAILED, this
// run has no such guarantee: a 'wait' then reports retry, and Screener: Write-back Retry reruns it.
const PIPELINE = 'CvDwpavqkHSRhg5Bn3L4';   // Screener — Plumbers
const STAGE = {
  'Owner Verified': 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f',
  'Gatekeeper':     'f83777fa-1dc0-4163-aa84-ef501126d82b',
  'Not Sure':       '0c160182-e74d-4ace-9d3b-c4404043ef4b',
  'Disqualified':   '65f9e1b4-8688-456d-845e-ebe0781101b9'
};
const FIELD = {
  outcome:  'iTZa77JWntQs2QBuo9QU',   // Screener Outcome (the screener's pick; n8n never writes it)
  date:     'MUkHW8R17PIksrSnpz6g',   // Date Screened
  noise:    'AbbR6jH9PFMLJCRdCqMp',   // Screen Noise
  verdict:  'boOwqb5qGOmbWBopWvTv'    // Screen AI Verdict (JSON written by Capture Call)
};
// Block label-users for the opportunity follower (spec §6) — the GHL users PT 06-07 … PT 15-16
// (Hridoy, 2026-09-23). A block with no id here gets its tag but no follower, and is reported.
const BLOCK_USER = {
  'PT 06-07': 'ZU6NEmag5FFcYAYwtu75', 'PT 07-08': 'QKMhxRVQX45dq2bxF5a5',
  'PT 08-09': 'u24gWdO3FlXhwjwhm6sE', 'PT 09-10': 'hdIv63msJcYjhwfIJ4eg',
  'PT 10-11': 'T4p1bK3yo6Bl14OK1LP3', 'PT 11-12': 'nTHz8ZbvpMxoWqsyJsLs',
  'PT 12-13': 'u1v0arwCtQw8kr9FSYIT', 'PT 13-14': '7KI79ZeuhHa1WrmFSaPH',
  'PT 14-15': 'j5w26gAQTznnaAgqRePi', 'PT 15-16': 'QlDlzTUPYag7RxkJ2B5Q'
};
const MIN_CONFIDENCE = 0.6;   // below this the prompt defines the model as guessing
const OWNER_MARKS = { 'Owner - Busy': 'busy', 'Owner - Quiet': 'quiet' };
const DEAD_ENDS = ['Wrong Number', 'Not A Plumber', 'Do Not Call'];
const MARKS = ['Owner - Busy', 'Owner - Quiet', 'Gatekeeper', 'Not Sure'].concat(DEAD_ENDS);
const BLOCK_TAGS = Object.keys(BLOCK_USER).map(b => 'screened-' + b.toLowerCase().replace(' ', '-'));
const GHL = 'https://services.leadconnectorhq.com';

const input = $('When Called by Screener').first().json;
const got = $('GHL: Get Contact').first().json;
const found = $('GHL: Find Screener Opp').first().json;
const contact = (got && got.contact) || null;
const contact_id = String(input.contact_id || '').trim();
const s = v => String(v == null ? '' : v).trim();
// The call this run is about (its screener_calls row gets writeback_ok); '' on the mark path.
const call_id = (() => { try { return s(JSON.parse(input.verdict_json).call_id); } catch (e) { return ''; } })();

const done = (action, reason, extra) => ({ json: Object.assign({
  contact_id, call_id, source: s(input.source), action, reason, result: '', stage_id: '', mismatch: false, retry: false, notes: [], ops: []
}, extra) });

// Guard: only contacts that are being screened. A misfired webhook must never touch Kevin's leads.
if (!contact_id) return done('skip', 'no contact_id');
// A failed read may be transient: 'retry' leaves writeback_ok = false for Screener: Write-back Retry.
if (!contact || !contact.id) return done('skip', 'contact not readable: ' + s(got && got.error && (got.error.description || got.error.message)), { retry: true });
const tags = (contact.tags || []).map(t => s(t).toLowerCase());
if (!tags.includes('screening')) return done('skip', 'contact is not tagged screening');

const cf = id => { const f = (contact.customFields || []).find(x => x.id === id); return f ? f.value : undefined; };
const parseVerdict = raw => { try { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch (e) { return null; } };

const notes = [];
const stored = parseVerdict(cf(FIELD.verdict));
let newVerdict = s(input.verdict_json) ? parseVerdict(input.verdict_json) : null;
// A retry of an OLDER call must never replace the verdict of a newer one (same rule as Plan Save).
const older = (a, b) => !!a && !!b && a.call_id !== b.call_id && Date.parse(b.answered_at) > Date.parse(a.answered_at);
if (older(newVerdict, stored)) { notes.push('call ' + s(newVerdict.call_id) + ' is older than the verdict on file: ignored'); newVerdict = null; }
const verdict = newVerdict || stored;
// GHL: Save Verdict normally stored it already; if that request failed, write it again here.
const verdictUnsaved = !!newVerdict && s(cf(FIELD.verdict)) !== s(input.verdict_json);
const rawMark = s(cf(FIELD.outcome));
const mark = MARKS.includes(rawMark) ? rawMark : '';
const force = input.force === true || input.force === 'true';
if (rawMark && !mark) notes.push('unknown Screener Outcome "' + rawMark + '" treated as unmarked');

// The AI backs "owner" only with a clean, confident, verifiable verdict (spec §4 cross-check).
const aiOwner = !!verdict && !verdict.ai_error && verdict.call_outcome === 'owner' &&
  verdict.owner_reached === 'yes' && Number(verdict.confidence) >= MIN_CONFIDENCE && verdict.quote_verified === true;

// Screener's mark wins; the AI catches mistakes. Dead ends need no AI: nothing the model says
// turns a wrong number into a lead, and a do-not-call must stop the dialling now.
let result = '', mismatch = false, reason = '';
if (DEAD_ENDS.includes(mark))            { result = 'Disqualified'; reason = mark; }
else if (!mark && !force)                { reason = 'waiting for the screener\'s mark'; }
else if (!mark)                          { result = 'Not Sure'; mismatch = true; reason = 'nothing marked'; }
else if (!verdict && !force)             { reason = 'waiting for the AI verdict'; }
else if (OWNER_MARKS[mark])              { result = aiOwner ? 'Owner Verified' : 'Not Sure'; mismatch = !aiOwner; reason = aiOwner ? 'screener and AI agree: owner' : 'screener says owner, AI does not confirm'; }
else if (mark === 'Gatekeeper')          { result = aiOwner ? 'Not Sure' : 'Gatekeeper'; mismatch = aiOwner; reason = aiOwner ? 'screener says gatekeeper, AI says owner' : 'gatekeeper'; }
else                                     { result = 'Not Sure'; mismatch = aiOwner; reason = aiOwner ? 'screener not sure, AI says owner' : 'not sure'; }

// ---- contact fields: written on wait too (the verdict and the noise must land either way) ----
const fields = [];
if (verdictUnsaved) fields.push({ id: FIELD.verdict, value: s(input.verdict_json) });
const noise = OWNER_MARKS[mark] || '';
if (s(cf(FIELD.noise)) !== noise && (mark || result)) fields.push({ id: FIELD.noise, value: noise });

const ops = [];
const op = (label, method, url, body) => ops.push({ label, method, url, body });
const pacificDate = iso => { const t = Date.parse(iso); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(isNaN(t) ? new Date() : new Date(t)); };

let stage_id = '', opp = null, retry = false;
if (result) {
  fields.push({ id: FIELD.date, value: pacificDate(verdict && verdict.answered_at) });
  const contactBody = { customFields: fields };
  if (mark === 'Do Not Call') contactBody.dnd = true;
  op('update contact fields', 'PUT', GHL + '/contacts/' + contact_id, contactBody);

  // Tags — replace, never append (spec §6): a lead is in one block, one noise class, at most.
  const owner = result === 'Owner Verified';
  const blockTag = owner && verdict ? s(verdict.pt_block_tag) : '';
  const want = [];
  if (owner) { want.push('owner-confirmed', 'screen-' + noise); if (blockTag) want.push(blockTag); }
  if (mismatch) want.push('screen-mismatch');
  const managed = ['owner-confirmed', 'screen-busy', 'screen-quiet', 'screen-mismatch'].concat(BLOCK_TAGS);
  const add = want.filter(t => !tags.includes(t));
  const remove = managed.filter(t => tags.includes(t) && !want.includes(t));
  if (add.length) op('add tags', 'POST', GHL + '/contacts/' + contact_id + '/tags', { tags: add });
  if (remove.length) op('remove tags', 'DELETE', GHL + '/contacts/' + contact_id + '/tags', { tags: remove });
  if (owner && !blockTag) notes.push('answered outside PT 06-16: no block tag or follower');

  // Stage + block follower on the screener opportunity.
  const opps = ((found && found.opportunities) || []).filter(o => o.pipelineId === PIPELINE && (o.status || 'open') === 'open');
  opp = opps[0] || null;
  stage_id = STAGE[result];
  if (!opp && found && found.error) { retry = true; notes.push('opportunity search failed: stage and follower not written'); }
  else if (!opp) notes.push('no open Screener — Plumbers opportunity: stage and follower not written');
  else {
    // GHL's opportunity SEARCH lags writes by seconds (live test 2026-09-24), so its stage and
    // followers can be stale: never skip on them. Both writes are idempotent — always send them.
    op('move stage -> ' + result, 'PUT', GHL + '/opportunities/' + opp.id, { pipelineId: PIPELINE, pipelineStageId: stage_id });
    const wantUser = owner && verdict ? (BLOCK_USER[s(verdict.pt_block)] || '') : '';
    if (owner && blockTag && !wantUser) notes.push('no user id for ' + s(verdict.pt_block) + ': follower skipped');
    const dropUsers = Object.values(BLOCK_USER).filter(u => u && u !== wantUser);
    op('remove other block followers', 'DELETE', GHL + '/opportunities/' + opp.id + '/followers', { followers: dropUsers });
    if (wantUser) op('add block follower', 'POST', GHL + '/opportunities/' + opp.id + '/followers', { followers: [wantUser] });
  }
} else if (fields.length) {
  op('update contact fields', 'PUT', GHL + '/contacts/' + contact_id, { customFields: fields });
}
// Waiting on a verdict that was NOT on the contact before our read: a Mark run may have read in
// between and waited too (codex review). Not done — the retry sweep reruns it save-first.
if (!result && verdictUnsaved) { retry = true; notes.push('verdict was not saved before the read: retry'); }

return done(result ? 'apply' : 'wait', reason, {
  result, stage_id, mismatch, retry, notes, ops,
  mark: rawMark, ai_outcome: verdict ? s(verdict.call_outcome) : '', ai_owner: aiOwner,
  opp_id: opp ? opp.id : '', verdict_call_id: verdict ? s(verdict.call_id) : ''
});
