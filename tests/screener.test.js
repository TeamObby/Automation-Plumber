/**
 * Static verification for the screener workflows (spec docs/screener-system-plan.md §10.2 items 1–4).
 * -----------------------------------------------------------------------------------------------
 * Runs the actual code nodes out of the workflow JSON snapshots:
 *   - Pacific hour block (item 3): both DST transitions, both block edges, the tag spelling contract
 *   - Normalize Call against the real GHL "Call Recorded" payload shape (from production exec 121333)
 *   - Prep Transcript: strict JSON schema, temperature 0, truncation, too-short transcripts
 *   - Parse Verdict: every guard (API error, bad enums, inconsistent fields, hallucinated quote)
 *   - Build Row: every field it emits is a screener_calls column (the upsert auto-maps by name)
 *   - The eval harness embeds exactly tests/fixtures/screener-transcripts.json
 *   - Compare Step (item 4): every row of the spec §4 cross-check, the screening guard, replace-never-append
 *   - Event ordering: every interleaving of a Capture run and a Mark run ends applied (persist-then-read)
 *   - Recovery: the three-way call_id dedupe and the retry flags that keep a failed write-back open
 *
 * The classifier's accuracy on those transcripts is NOT checked here — that needs the model.
 * Run the n8n workflow "Screener: Classifier Eval" (FMUXvDBXsigHA4vb) for that.
 *
 * Run:  node tests/screener.test.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const wf = p => JSON.parse(fs.readFileSync(path.join(ROOT, 'workflows/screener', p), 'utf8'));
const codeOf = (d, n) => {
  const node = d.nodes.find(x => x.name === n);
  if (!node) throw new Error('node not found: ' + n);
  return node.parameters.jsCode;
};
// Code nodes read $json and $('Node'); both are mocked. Returns the node's json output.
const run = (code, $json, nodes = {}) => {
  const out = new Function('$json', '$', code)($json, name => {
    if (!(name in nodes)) throw new Error('mock missing node: ' + name);
    return nodes[name];
  });
  return Array.isArray(out) ? out : out.json;
};
const item = json => ({ item: { json }, first: () => ({ json }) });

let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) PASS++; else { FAIL++; console.log('  ✗ FAIL:', m); } };

const capture = wf('Screener Capture Call.json');
const classifier = wf('Screener Classify Transcript.json');
const evalWf = wf('Screener Classifier Eval.json');
const NORMALIZE = codeOf(capture, 'Normalize Call');

console.log('=== 1) Pacific hour block (item 3) ===');
const block = iso => run(NORMALIZE, { body: { customData: { call_id: 'x', call_answered_at_timestamp: iso } } });
[
  ['2026-09-21T16:38:45.357Z', 'PT 09-10', 'PDT (UTC-7)'],
  ['2026-12-01T17:05:00Z',     'PT 09-10', 'PST (UTC-8)'],
  ['2026-09-21T13:00:00Z',     'PT 06-07', 'first block opens 06:00'],
  ['2026-09-21T12:59:59Z',     '',         '05:59 is before the first block'],
  ['2026-09-21T22:59:59Z',     'PT 15-16', '15:59 is in the last block'],
  ['2026-09-21T23:00:00Z',     '',         '16:00 is after the last block'],
  ['2026-11-01T08:30:00Z',     '',         '01:30 on fall-back day'],
  ['2026-11-01T17:30:00Z',     'PT 09-10', 'after fall-back (PST)'],
  ['2026-03-08T17:30:00Z',     'PT 10-11', 'after spring-forward (PDT)'],
  ['',                         '',         'missing timestamp'],
  ['not-a-date',               '',         'garbage timestamp'],
].forEach(([iso, want, why]) => {
  const o = block(iso);
  ok(o.pt_block === want, `${why}: ${iso} -> '${o.pt_block}', want '${want}'`);
  ok(o.pt_block_tag === (want ? 'screened-' + want.toLowerCase().replace(' ', '-') : ''), `${why}: tag '${o.pt_block_tag}'`);
});
// The exact spelling Hridoy's Smart Lists filter on (spec §10.3) — n8n compares literally.
ok(block('2026-09-21T17:10:00Z').pt_block_tag === 'screened-pt-10-11', 'tag contract: screened-pt-10-11');

console.log('=== 2) Normalize Call vs the real call-recorded payload ===');
const real = { body: { contact_id: 'C1', full_name: 'Dana Happy', customData: {
  call_id: '01a0c4d5-5848-7005-aa8f-d17f2e19aa84', ghl_user_id: 'qrmoKEhW0r2xQCAiH5Yp', wavv_caller_id: '8055727879',
  contact_id: 'C1', contact_name: 'Dana Happy', call_duration_seconds: '99', call_outcome: 'TRANSFERRED',
  call_recording_url: 'https://file.wavv.com/recordings/x/call.mp3', call_transcript: '  Hello? Hi.  ',
  call_answered_at_timestamp: '2026-09-21T16:38:45.357Z', call_type: 'TARGET' } } };
let n = run(NORMALIZE, real);
ok(n.call_id === '01a0c4d5-5848-7005-aa8f-d17f2e19aa84', 'call_id from customData');
ok(n.ghl_user_id === 'qrmoKEhW0r2xQCAiH5Yp' && n.wavv_caller_id === '8055727879', 'caller identity (screener attribution)');
ok(n.duration_sec === 99 && typeof n.duration_sec === 'number', 'duration is a number (data table column type)');
ok(n.transcript === 'Hello? Hi.' && n.transcript_source === 'wavv', 'WAVV transcript trimmed, source wavv');
ok(n.is_pickup && !n.needs_transcription, 'answered with transcript -> no Whisper');
n = run(NORMALIZE, { customData: { call_id: 'z', call_recording_url: 'u', call_answered_at_timestamp: '2026-09-21T16:38:45Z' } });
ok(n.needs_transcription && n.transcript_source === '', 'recording but no transcript -> Whisper fallback');
ok(!run(NORMALIZE, { body: { customData: { call_id: 'z' } } }).is_pickup, 'no answered timestamp -> not a pickup (filtered out)');

console.log('=== 3) Prep Transcript (item 2: strict schema) ===');
const PREP = codeOf(classifier, 'Prep Transcript');
let p = run(PREP, { transcript: 'x'.repeat(13000), contact_name: 'Acme' });
ok(p.truncated && p.transcript.length === 12000 && p.has_text, 'long transcript truncated to 12k');
ok(p.request.temperature === 0, 'temperature 0');
const js = p.request.response_format.json_schema;
ok(js.strict === true && js.schema.additionalProperties === false, 'strict JSON schema');
ok(JSON.stringify(js.schema.required.slice().sort()) === JSON.stringify(Object.keys(js.schema.properties).sort()),
   'strict mode: every property is required');
ok(js.schema.properties.owner_reached.enum.join() === 'yes,no,unclear', 'owner_reached enum');
ok(run(PREP, { transcript: 'Wrong number.' }).has_text, 'short but meaningful answer is classified (codex review #1)');
ok(run(PREP, { transcript: 'Do not call again.' }).has_text, 'short do-not-call is classified');
ok(run(PREP, { transcript: 'আমি মালিক' }).has_text, 'non-Latin speech is classified');
ok(!run(PREP, { transcript: '   ' }).has_text, 'blank transcript -> no model call');
ok(!run(PREP, { transcript: '... --' }).has_text, 'punctuation-only transcript -> no model call');
ok(p.request.messages[1].content.startsWith('Business on file: Acme'), 'business name passed to the model');

console.log('=== 4) Parse Verdict guards ===');
const PARSE = codeOf(classifier, 'Parse Verdict');
const prepNode = { 'Prep Transcript': item({ transcript: "Ramirez Plumbing. It's just me and my son, I own the shop.", truncated: false, request: { model: 'gpt-4.1-mini' } }) };
const resp = o => ({ choices: [{ message: { content: JSON.stringify(o) } }] });
const verdict = (o, extra = {}) => run(PARSE, resp({ confidence: 0.9, evidence_quote: '', owner_name: '', ...o }), { ...prepNode, ...extra });
let v = verdict({ call_outcome: 'owner', owner_reached: 'yes', evidence_quote: 'I own the shop' });
ok(v.call_outcome === 'owner' && v.owner_reached === 'yes' && v.quote_verified && v.ai_error === '' && v.model === 'gpt-4.1-mini', 'clean owner verdict');
v = verdict({ call_outcome: 'owner', owner_reached: 'no' });
ok(v.owner_reached === 'unclear', 'owner + reached=no is inconsistent -> unclear');
v = verdict({ call_outcome: 'gatekeeper', owner_reached: 'yes' });
ok(v.owner_reached === 'unclear', 'reached=yes without owner outcome -> unclear');
v = verdict({ call_outcome: 'owner', owner_reached: 'yes', evidence_quote: 'I am the boss here' });
ok(!v.quote_verified && v.evidence_quote === 'I am the boss here', 'quote not in transcript is kept but flagged');
['...', '我是老板', '   ', '-'].forEach(q => {
  v = verdict({ call_outcome: 'owner', owner_reached: 'yes', evidence_quote: q });
  ok(!v.quote_verified, `quote '${q}' must not verify against an unrelated transcript (codex review #3)`);
});
v = run(PARSE, resp({ call_outcome: 'owner', owner_reached: 'yes', confidence: 0.9, evidence_quote: 'আমি মালিক', owner_name: '' }),
  { 'Prep Transcript': item({ transcript: 'হ্যালো, আমি মালিক, বলুন।', truncated: false, request: { model: 'm' } }) });
ok(v.quote_verified, 'a real non-Latin quote verifies');
// Codex review round 2: combining marks carry meaning, and not every language uses spaces.
const quoteCheck = (transcript, quote) => run(PARSE,
  resp({ call_outcome: 'owner', owner_reached: 'yes', confidence: 0.9, evidence_quote: quote, owner_name: '' }),
  { 'Prep Transcript': item({ transcript, truncated: false, request: { model: 'm' } }) }).quote_verified;
ok(!quoteCheck('হ্যালো, আমি মালিক, বলুন।', 'আমি মুলুক'), 'Bengali: different vowel signs must not verify (মালিক ≠ মুলুক)');
ok(quoteCheck('হ্যালো, আমি মালিক, বলুন।', 'আমি মালিক'), 'Bengali: exact phrase verifies');
ok(quoteCheck('你好我是老板谢谢', '我是老板'), 'Chinese: excerpt inside unspaced text verifies');
ok(!quoteCheck('你好我是老板谢谢', '我是经理'), 'Chinese: absent phrase does not verify');
ok(quoteCheck('もしもし、私がオーナーです。', '私がオーナーです'), 'Japanese: excerpt verifies');
ok(quoteCheck('Hola, soy el dueño del taller.', 'soy el dueño'), 'Spanish with accents verifies');
ok(!quoteCheck("Ramirez Plumbing. I own the shop.", 'own the sho'), 'Latin: partial word at the edge does not verify');
ok(!quoteCheck("I owned the shop once.", 'I own'), 'Latin: word prefix does not verify');
ok(quoteCheck('Café Plumbing. I own the shop.', 'cafe plumbing') === false, 'accent-sensitive: é is not e (no false merge)');
v = verdict({ call_outcome: 'owner', owner_reached: 'yes', confidence: 7 });
ok(v.confidence === 1, 'confidence clamped to [0,1]');
v = verdict({ call_outcome: 'banana', owner_reached: 'maybe', confidence: 'x' });
ok(v.call_outcome === 'unclear' && v.owner_reached === 'unclear' && v.confidence === 0, 'unknown enums -> unclear');
v = run(PARSE, { error: { message: 'Rate limit reached' } }, prepNode);
ok(v.call_outcome === 'unclear' && v.confidence === 0 && v.ai_error === 'Rate limit reached', 'API error -> unclear, reason kept');
v = run(codeOf(classifier, 'No Transcript Verdict'), {});
ok(v.call_outcome === 'unclear' && v.owner_reached === 'unclear' && v.ai_error === 'no transcript', 'no transcript -> unclear, no model call');

console.log('=== 5) Build Row == screener_calls columns ===');
const COLUMNS = ['ai_ok','call_id','contact_id','contact_name','ghl_user_id','wavv_caller_id','answered_at','pt_block','pt_block_tag','duration_sec','recording_url','transcript','transcript_source','ai_call_outcome','ai_owner_reached','ai_confidence','ai_evidence_quote','ai_quote_verified','ai_owner_name','ai_model','ai_error','received_at'];
const norm = run(NORMALIZE, real);
const row = run(codeOf(capture, 'Build Row'), verdict({ call_outcome: 'owner', owner_reached: 'yes', evidence_quote: 'I own the shop' }),
  { 'Transcript Ready': item(norm) });
ok(JSON.stringify(Object.keys(row).sort()) === JSON.stringify(COLUMNS.slice().sort()), 'Build Row fields == data table columns');
const store = capture.nodes.find(x => x.name === 'Store: screener_calls (upsert on call_id)');
const WRITEBACK_COLS = ['writeback_ok', 'writeback_result'];   // set only by Record Write-back, never by Build Row
ok(JSON.stringify(store.parameters.columns.schema.map(c => c.id).sort()) === JSON.stringify(COLUMNS.concat(WRITEBACK_COLS).sort()), 'upsert schema == data table columns');
ok(store.parameters.filters.conditions[0].keyName === 'call_id', 'upsert keyed on call_id');
const findRow = capture.nodes.find(x => x.name === 'Find Row: screener_calls by call_id');
ok(findRow.parameters.operation === 'get' && findRow.parameters.filters.conditions[0].keyName === 'call_id' && findRow.alwaysOutputData === true,
   'dedupe reads the row by call_id before the AI call, and still outputs when there is none');
// Three-way dedupe (codex reviews: a failed AI call AND a failed GHL write-back must both be retryable).
const ROUTE = codeOf(capture, 'Route Replay');
const route = rowJson => {
  const out = new Function('$json', '$input', '$', ROUTE)({}, { first: () => ({ json: rowJson }) },
    n => ({ first: () => ({ json: { call_id: 'c1', transcript: 'hi', needs_transcription: false } }) }));
  return out[0].json;
};
ok(route({}).route === 'classify' && route({}).transcript === 'hi', 'new call -> classify (normalized payload passes through)');
ok(route({ call_id: 'c1', ai_ok: false, writeback_ok: true }).route === 'classify', 'AI failed last time -> classify again');
ok(route({ call_id: 'c1', ai_ok: true, writeback_ok: true }).route === 'done', 'classified and written back -> stop');
const wb = route({ call_id: 'c1', ai_ok: true, writeback_ok: false, ai_call_outcome: 'owner', contact_id: 'C1' });
ok(wb.route === 'writeback' && wb.ai_call_outcome === 'owner' && wb.contact_id === 'C1', 'GHL write-back failed -> retry compare with the STORED verdict (no AI)');
ok(route({ call_id: 'c1', ai_ok: true }).route === 'writeback', 'row from before writeback_ok existed -> retried once');
const conn = (w, from) => ((w.connections[from] || {}).main || []).map(o => o.map(x => x.node));
ok(JSON.stringify(conn(capture, 'IF: verdict already stored?')) === JSON.stringify([['Verdict For Contact'], ['IF: transcript missing?']]), 'stored verdict skips the AI');
ok(JSON.stringify(conn(capture, 'Screener: Compare Step')) === JSON.stringify([['Record Write-back']]), 'the compare result is recorded on the row');
const rec = capture.nodes.find(x => x.name === 'Record Write-back');
ok(rec.parameters.operation === 'update' && rec.parameters.columns.value.writeback_ok === '={{ $json.ok === true }}', 'writeback_ok = the Compare Step\'s ok');
ok(row.ai_ok === true, 'clean verdict -> ai_ok true');
const failedRow = run(codeOf(capture, 'Build Row'), run(PARSE, { error: { message: 'Rate limit reached' } }, prepNode), { 'Transcript Ready': item(norm) });
ok(failedRow.ai_ok === false, 'API failure -> ai_ok false (retryable)');
const noTxRow = run(codeOf(capture, 'Build Row'), run(codeOf(classifier, 'No Transcript Verdict'), {}), { 'Transcript Ready': item(norm) });
ok(noTxRow.ai_ok === false, 'no transcript -> ai_ok false (retryable once Whisper/WAVV recovers)');

console.log('=== 6) Eval harness embeds the repo fixtures ===');
const fixtures = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/screener-transcripts.json'), 'utf8'));
const loaded = run(codeOf(evalWf, 'Load Fixtures'), {}).map(i => i.json);
ok(fixtures.length === 8, '8 hand-written transcripts (spec §10.2 item 2)');
ok(loaded.length === fixtures.length * 3, 'each fixture run 3x');
ok(fixtures.every(f => loaded.filter(l => l.id === f.id && l.transcript === f.transcript).length === 3),
   'eval workflow fixtures == tests/fixtures/screener-transcripts.json');

console.log('=== 7) Compare Step: the screener\'s mark vs the AI (item 4, spec §4 cross-check) ===');
const compareWf = wf('Screener Compare Step.json');
const DECIDE = codeOf(compareWf, 'Decide');
const ST = { ownerVerified: 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f', gatekeeper: 'f83777fa-1dc0-4163-aa84-ef501126d82b',
  notSure: '0c160182-e74d-4ace-9d3b-c4404043ef4b', disqualified: '65f9e1b4-8688-456d-845e-ebe0781101b9', attempt1: '7ff9193f-1e0a-4c93-9626-a6aab22b666b' };
const F = { outcome: 'iTZa77JWntQs2QBuo9QU', date: 'MUkHW8R17PIksrSnpz6g', noise: 'AbbR6jH9PFMLJCRdCqMp', verdict: 'boOwqb5qGOmbWBopWvTv' };
const V = over => Object.assign({ call_id: 'call-1', answered_at: '2026-09-21T17:38:45Z', pt_block: 'PT 10-11', pt_block_tag: 'screened-pt-10-11',
  call_outcome: 'owner', owner_reached: 'yes', confidence: 0.9, quote_verified: true, evidence_quote: 'I own the shop', ai_error: '' }, over);
const decide = ({ mark = '', verdict = null, newVerdict = null, tags = ['screening'], force = false, source = 'mark', fields = [], opps, contact } = {}) => {
  const cfs = fields.slice();
  if (mark) cfs.push({ id: F.outcome, value: mark });
  if (verdict) cfs.push({ id: F.verdict, value: JSON.stringify(verdict) });
  return run(DECIDE, {}, {
    'When Called by Screener': item({ contact_id: 'C1', verdict_json: newVerdict ? JSON.stringify(newVerdict) : '', source, force }),
    'GHL: Get Contact': item(contact !== undefined ? contact : { contact: { id: 'C1', tags, customFields: cfs } }),
    'GHL: Find Screener Opp': item({ opportunities: opps || [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: ST.attempt1, status: 'open', followers: [] } ] })
  });
};
const opOf = (d, label) => d.ops.find(o => o.label.startsWith(label));
const stageOf = d => { const o = opOf(d, 'move stage'); return o ? o.body.pipelineStageId : ''; };

// The table in spec §4, row by row.
[
  ['Owner - Busy',  V(),                                       'Owner Verified', false, 'owner + AI owner'],
  ['Owner - Quiet', V(),                                       'Owner Verified', false, 'owner (quiet) + AI owner'],
  ['Owner - Busy',  V({ call_outcome: 'gatekeeper', owner_reached: 'no' }), 'Not Sure', true, 'owner + AI not owner'],
  ['Owner - Busy',  V({ call_outcome: 'unclear', owner_reached: 'unclear' }), 'Not Sure', true, 'owner + AI unclear'],
  ['Owner - Busy',  V({ confidence: 0.5 }),                    'Not Sure',       true,  'owner + AI low confidence'],
  ['Owner - Busy',  V({ quote_verified: false }),              'Not Sure',       true,  'owner + AI quote not in transcript'],
  ['Owner - Busy',  V({ ai_error: 'no transcript', call_outcome: 'unclear', owner_reached: 'unclear' }), 'Not Sure', true, 'owner + AI failed'],
  ['Gatekeeper',    V({ call_outcome: 'gatekeeper', owner_reached: 'no' }), 'Gatekeeper', false, 'gatekeeper + AI gatekeeper'],
  ['Gatekeeper',    V({ call_outcome: 'unclear', owner_reached: 'unclear' }), 'Gatekeeper', false, 'gatekeeper + AI unclear (no contradiction)'],
  ['Gatekeeper',    V(),                                       'Not Sure',       true,  'gatekeeper + AI owner'],
  ['Not Sure',      V(),                                       'Not Sure',       true,  'not sure + AI owner'],
  ['Not Sure',      V({ call_outcome: 'unclear', owner_reached: 'unclear' }), 'Not Sure', false, 'not sure + AI unclear'],
  ['Wrong Number',  V(),                                       'Disqualified',   false, 'dead end: the mark alone decides'],
  ['Not A Plumber', null,                                      'Disqualified',   false, 'dead end needs no AI verdict'],
].forEach(([mark, verdict, want, mm, why]) => {
  const d = decide({ mark, verdict });
  ok(d.action === 'apply' && d.result === want && d.mismatch === mm, `${why}: want ${want}${mm ? ' + mismatch' : ''}, got ${d.action}/${d.result}/${d.mismatch}`);
});

// Whichever arrives first waits for the other (spec §4.1).
let d = decide({ newVerdict: V(), source: 'call' });
ok(d.action === 'wait' && d.ops.length === 1 && opOf(d, 'update contact').body.customFields.some(f => f.id === F.verdict && JSON.parse(f.value).call_id === 'call-1'),
   'AI first: only the verdict is written, then it waits');
d = decide({ mark: 'Owner - Busy' });
ok(d.action === 'wait' && d.reason.includes('AI verdict'), 'mark first: waits for the AI');
ok(opOf(d, 'update contact').body.customFields.some(f => f.id === F.noise && f.value === 'busy'), 'mark first: Screen Noise written right away');
ok(!opOf(d, 'move stage') && !opOf(d, 'add tags'), 'waiting writes no stage and no tags');
d = decide({ mark: 'Owner - Busy', fields: [{ id: F.noise, value: 'busy' }] });
ok(d.ops.length === 0, 'nothing new to write -> no requests');
d = decide({ mark: 'Owner - Busy', newVerdict: V(), source: 'call' });
ok(d.result === 'Owner Verified' && opOf(d, 'update contact').body.customFields.some(f => f.id === F.verdict), 'AI second: verdict written AND compared in the same run');
d = decide({ mark: 'Gatekeeper', verdict: V({ call_id: 'old' }), newVerdict: V({ call_id: 'new', call_outcome: 'gatekeeper', owner_reached: 'no' }), source: 'call' });
ok(d.result === 'Gatekeeper' && d.call_id === 'new', 'a new verdict replaces the stored one');

// Forced (the next dial started and the mark never came).
d = decide({ verdict: V(), force: true });
ok(d.result === 'Not Sure' && d.mismatch && d.reason === 'nothing marked', 'force + nothing marked -> Not Sure + mismatch');
d = decide({ mark: 'Owner - Busy', force: true });
ok(d.result === 'Not Sure' && d.mismatch, 'force + owner mark + no verdict -> AI did not confirm');
d = decide({ mark: 'Gatekeeper', force: true });
ok(d.result === 'Gatekeeper' && !d.mismatch, 'force + gatekeeper + no verdict -> Gatekeeper');
d = decide({ mark: 'owner busy', verdict: V() });
ok(d.action === 'wait' && d.notes.some(n => n.includes('unknown Screener Outcome')), 'misspelt option -> unmarked, and reported');

// Guards: never touch a contact that is not being screened.
ok(decide({ mark: 'Owner - Busy', verdict: V(), tags: ['plumber'] }).action === 'skip', 'no screening tag -> skip');
ok(decide({ mark: 'Owner - Busy', verdict: V(), contact: { error: { message: '404' } } }).action === 'skip', 'contact not found -> skip');
ok(decide({ mark: 'Owner - Busy', verdict: V(), tags: ['Screening'] }).action === 'apply', 'tag match is case-insensitive (GHL lowercases)');

// Owner Verified writes (spec §6: replace, never append).
d = decide({ mark: 'Owner - Busy', verdict: V(), tags: ['screening', 'screened-pt-08-09', 'screen-quiet', 'screen-mismatch'] });
ok(stageOf(d) === ST.ownerVerified, 'stage -> Owner Verified');
ok(JSON.stringify(opOf(d, 'add tags').body.tags.sort()) === JSON.stringify(['owner-confirmed', 'screen-busy', 'screened-pt-10-11']), 'adds owner-confirmed, noise, block tag');
ok(JSON.stringify(opOf(d, 'remove tags').body.tags.sort()) === JSON.stringify(['screen-mismatch', 'screen-quiet', 'screened-pt-08-09']), 'removes the old block, the other noise, the mismatch');
const cfw = opOf(d, 'update contact').body.customFields;
ok(cfw.some(f => f.id === F.date && f.value === '2026-09-21'), 'Date Screened = Pacific date of the answered call');
ok(cfw.some(f => f.id === F.noise && f.value === 'busy'), 'Screen Noise = busy');
ok(!cfw.some(f => f.id === F.outcome), 'n8n never writes the screener\'s own field');
ok(JSON.stringify(opOf(d, 'add block follower').body.followers) === '["T4p1bK3yo6Bl14OK1LP3"]', 'PT 10-11 -> the PT 10-11 block user (Hridoy, 2026-09-23) follows the opp');
ok(opOf(d, 'update contact').body.dnd === undefined, 'no DND unless Do Not Call');
d = decide({ mark: 'Owner - Busy', verdict: V({ pt_block: '', pt_block_tag: '' }) });
ok(!opOf(d, 'add tags').body.tags.some(t => t.startsWith('screened-')) && d.notes.some(n => n.includes('outside PT')), 'answered outside the blocks -> no block tag, reported');

// Non-owner results strip the owner markers; dead ends; opportunity edge cases.
d = decide({ mark: 'Gatekeeper', verdict: V({ call_outcome: 'gatekeeper', owner_reached: 'no' }), tags: ['screening', 'owner-confirmed', 'screened-pt-10-11', 'screen-busy'], fields: [{ id: F.noise, value: 'busy' }] });
ok(stageOf(d) === ST.gatekeeper && !opOf(d, 'add tags'), 'gatekeeper: stage move, nothing to add');
ok(JSON.stringify(opOf(d, 'remove tags').body.tags.sort()) === JSON.stringify(['owner-confirmed', 'screen-busy', 'screened-pt-10-11']), 'a correction to gatekeeper removes the owner tags');
ok(opOf(d, 'update contact').body.customFields.some(f => f.id === F.noise && f.value === ''), 'and clears Screen Noise');
d = decide({ mark: 'Owner - Busy', verdict: V({ confidence: 0.3 }) });
ok(stageOf(d) === ST.notSure && opOf(d, 'add tags').body.tags.includes('screen-mismatch') && !opOf(d, 'add tags').body.tags.includes('owner-confirmed'), 'mismatch: Not Sure + screen-mismatch, no owner tags');
d = decide({ mark: 'Do Not Call' });
ok(stageOf(d) === ST.disqualified && opOf(d, 'update contact').body.dnd === true, 'Do Not Call -> Disqualified + DND on the contact');
d = decide({ mark: 'Gatekeeper', verdict: V({ owner_reached: 'no', call_outcome: 'gatekeeper' }), opps: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: ST.gatekeeper, status: 'open', followers: [] } ] });
ok(stageOf(d) === ST.gatekeeper, 'stage move sent even when search says it is already there (search lags writes)');
d = decide({ mark: 'Gatekeeper', verdict: V({ owner_reached: 'no', call_outcome: 'gatekeeper' }), opps: [ { id: 'K1', pipelineId: 'OTHER', status: 'open' }, { id: 'O2', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: ST.attempt1, status: 'lost' } ] });
ok(!opOf(d, 'move stage') && d.opp_id === '' && d.notes.some(n => n.includes('no open Screener')), 'no open screener opp -> fields/tags only, reported; Kevin\'s opp never touched');
ok(d.ops.every(o => o.url.startsWith('https://services.leadconnectorhq.com/')) && d.ops.every(o => ['PUT', 'POST', 'DELETE'].includes(o.method)), 'every op is a GHL write');

// Followers: the real block-user ids (spec, Hridoy 2026-09-23), replace-never-append.
const U = { 'PT 06-07': 'ZU6NEmag5FFcYAYwtu75', 'PT 07-08': 'QKMhxRVQX45dq2bxF5a5', 'PT 08-09': 'u24gWdO3FlXhwjwhm6sE',
  'PT 09-10': 'hdIv63msJcYjhwfIJ4eg', 'PT 10-11': 'T4p1bK3yo6Bl14OK1LP3', 'PT 11-12': 'nTHz8ZbvpMxoWqsyJsLs',
  'PT 12-13': 'u1v0arwCtQw8kr9FSYIT', 'PT 13-14': '7KI79ZeuhHa1WrmFSaPH', 'PT 14-15': 'j5w26gAQTznnaAgqRePi', 'PT 15-16': 'QlDlzTUPYag7RxkJ2B5Q' };
ok(Object.entries(U).every(([b, id]) => DECIDE.includes("'" + b + "': '" + id + "'")), 'all ten block users are in Decide, each on its own block');
ok(new Set(Object.values(U)).size === 10, 'ten distinct user ids');
const decideCode = (code, mark, verdict, followers) => run(code, {}, {
  'When Called by Screener': item({ contact_id: 'C1', verdict_json: '', source: 'mark', force: false }),
  'GHL: Get Contact': item({ contact: { id: 'C1', tags: ['screening'], customFields: [ { id: F.outcome, value: mark }, { id: F.verdict, value: JSON.stringify(verdict) } ] } }),
  'GHL: Find Screener Opp': item({ opportunities: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: ST.attempt1, status: 'open', followers } ] })
});
const decideU = (mark, verdict, followers) => decideCode(DECIDE, mark, verdict, followers);
const others = keep => Object.values(U).filter(u => u !== keep).sort();
d = decideU('Owner - Busy', V(), [U['PT 08-09'], 'KEVIN-TZ']);
ok(JSON.stringify(opOf(d, 'remove other block followers').body.followers.slice().sort()) === JSON.stringify(others(U['PT 10-11'])) &&
   JSON.stringify(opOf(d, 'add block follower').body.followers) === JSON.stringify([U['PT 10-11']]),
   'follower: every other block user removed, the new one added; non-block followers (TZ) never in the request');
d = decideU('Owner - Busy', V(), []);
ok(opOf(d, 'add block follower') && opOf(d, 'remove other block followers'), 'follower writes do not depend on the (lagging) search result');
d = decideU('Gatekeeper', V({ owner_reached: 'no', call_outcome: 'gatekeeper' }), [U['PT 10-11']]);
ok(JSON.stringify(opOf(d, 'remove other block followers').body.followers.slice().sort()) === JSON.stringify(Object.values(U).sort()) && !opOf(d, 'add block follower'),
   'non-owner result removes all ten block followers, adds none');
const DECIDE_GAP = DECIDE.replace("'PT 10-11': 'T4p1bK3yo6Bl14OK1LP3'", "'PT 10-11': ''");
ok(DECIDE_GAP !== DECIDE, 'test rig: one block blanked');
d = decideCode(DECIDE_GAP, 'Owner - Busy', V(), []);
ok(d.notes.some(n => n.includes('no user id for PT 10-11')) && !opOf(d, 'add block follower') && opOf(d, 'add tags').body.tags.includes('screened-pt-10-11'),
   'a block with no user id -> tag still written, follower skipped and reported');

// Capture hands the verdict over; Mark only passes contact_id.
const vfc = run(codeOf(capture, 'Verdict For Contact'), row);
const vj = JSON.parse(vfc.verdict_json);
ok(vfc.call_id === row.call_id && vfc.contact_id === row.contact_id && vj.call_id === row.call_id && vj.pt_block_tag === row.pt_block_tag && vj.call_outcome === row.ai_call_outcome && vj.quote_verified === row.ai_quote_verified,
   'Verdict For Contact carries what Decide reads');
ok(['call_outcome', 'owner_reached', 'confidence', 'quote_verified', 'ai_error', 'answered_at', 'pt_block', 'pt_block_tag'].every(k => k in vj), 'verdict JSON has every field Decide uses');
const markWf = wf('Screener Mark + Compare.json');
const nm = run(codeOf(markWf, 'Normalize Mark'), { body: { contact_id: 'C9', customData: { screener_outcome: 'Gatekeeper' } } });
ok(nm.contact_id === 'C9' && nm.mark_in_payload === 'Gatekeeper', 'Normalize Mark reads contact_id from the GHL body');
const compareCalls = [capture, markWf].map(w => w.nodes.find(n => n.name === 'Screener: Compare Step'));
ok(compareCalls.every(n => n && n.parameters.workflowId.value === require('../workflows/screener/build/ids.json').compare), 'both callers point at the Compare Step id');
ok(compareCalls[0].parameters.workflowInputs.value.source === 'call' && compareCalls[1].parameters.workflowInputs.value.source === 'mark', 'callers identify themselves');

console.log('=== 8) Event ordering and recovery (codex review of item 4) ===');
// Overlapping events: a Capture run and a Mark run against one GHL contact, in every interleaving.
// Capture = [persist verdict, read]; Mark = [GHL saves the mark, read] (GHL fires the webhook after
// saving). Whichever run reads second must see both values, so at least one run applies.
const VJ = JSON.stringify(V());
const interleavings = (a, b) => !a.length ? [b] : !b.length ? [a]
  : interleavings(a.slice(1), b).map(r => [a[0]].concat(r)).concat(interleavings(a, b.slice(1)).map(r => [b[0]].concat(r)));
const simulate = (captureSteps, order) => {
  const store = { id: 'C1', tags: ['screening'], customFields: [] };
  const set = (id, value) => { store.customFields = store.customFields.filter(f => f.id !== id).concat([{ id, value }]); };
  const snap = {};
  const act = { P: () => set(F.verdict, VJ), W: () => set(F.outcome, 'Owner - Busy'),
                RC: () => { snap.capture = JSON.parse(JSON.stringify(store)); }, RM: () => { snap.mark = JSON.parse(JSON.stringify(store)); } };
  order.forEach(step => act[step]());
  const call = (snapshot, input) => run(DECIDE, {}, {
    'When Called by Screener': item(input), 'GHL: Get Contact': item({ contact: snapshot }),
    'GHL: Find Screener Opp': item({ opportunities: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: ST.attempt1, status: 'open', followers: [] } ] }) });
  return [call(snap.capture, { contact_id: 'C1', verdict_json: VJ, source: 'call', force: false }),
          call(snap.mark,    { contact_id: 'C1', verdict_json: '', source: 'mark', force: false })];
};
const fixedOrders = interleavings(['P', 'RC'], ['W', 'RM']);
ok(fixedOrders.length === 6, '6 interleavings of the two runs');
fixedOrders.forEach(order => {
  const runs = simulate(null, order);
  ok(runs.some(r => r.action === 'apply' && r.result === 'Owner Verified'), 'persist-then-read: ' + order.join(',') + ' -> at least one run applies');
});
// The old protocol (read, then persist) really did have a stuck ordering — the check above can fail.
const oldStuck = interleavings(['RC', 'P'], ['W', 'RM']).some(order => simulate(null, order).every(r => r.action === 'wait'));
ok(oldStuck, 'read-then-persist (the reviewed bug) has an ordering where both runs wait');

// The Compare Step is wired persist-then-read, and the save is behind the screening guard.
ok(JSON.stringify(conn(compareWf, 'When Called by Screener')) === '[["GHL: Guard Read"]]' &&
   JSON.stringify(conn(compareWf, 'GHL: Guard Read')) === '[["Plan Save"]]' &&
   JSON.stringify(conn(compareWf, 'Plan Save')) === '[["Save verdict first?"]]' &&
   JSON.stringify(conn(compareWf, 'Save verdict first?')) === '[["GHL: Save Verdict"],["GHL: Get Contact"]]' &&
   JSON.stringify(conn(compareWf, 'GHL: Save Verdict')) === '[["GHL: Get Contact"]]' &&
   JSON.stringify(conn(compareWf, 'GHL: Get Contact')) === '[["GHL: Find Screener Opp"]]', 'Guard Read -> Save Verdict -> fresh Get Contact -> Decide');
const PLAN_SAVE = codeOf(compareWf, 'Plan Save');
const planSave = (contact, verdictJson) => run(PLAN_SAVE, { contact }, { 'When Called by Screener': item({ contact_id: 'C1', verdict_json: verdictJson }) });
const withVerdict = (tags, v) => ({ id: 'C1', tags, customFields: v ? [ { id: F.verdict, value: JSON.stringify(v) } ] : [] });
ok(planSave(withVerdict(['screening'], null), VJ).save === true, 'new verdict on a screening contact -> saved first');
ok(planSave(withVerdict(['plumber'], null), VJ).save === false, 'not tagged screening -> never saved');
ok(planSave(withVerdict(['screening'], null), '').save === false, 'mark path (no verdict) -> nothing to save');
ok(planSave(withVerdict(['screening'], V()), VJ).save === false, 'already on the contact -> not saved twice');
const NEWER = V({ call_id: 'call-2', answered_at: '2026-09-22T17:00:00Z' });
const pOld = planSave(withVerdict(['screening'], NEWER), VJ);
ok(pOld.save === false && pOld.older === true, 'a retry of an OLDER call never overwrites a newer verdict');
ok(planSave({ error: { message: '502' } }, VJ).save === false, 'guard read failed -> no save (Decide reports retry)');
const saveNode = compareWf.nodes.find(n => n.name === 'GHL: Save Verdict');
ok(saveNode.parameters.method === 'PUT' && saveNode.parameters.jsonBody.includes("'" + F.verdict + "'"), 'Save Verdict writes only the Screen AI Verdict field');
ok(JSON.stringify(conn(compareWf, 'Anything to write?')) === '[["Split Ops"],["Report"]]', 'Report runs on both branches, so callers always get ok');

// Save Verdict failed -> Decide writes it again; saved -> not twice.
d = decide({ newVerdict: V(), source: 'call' });
ok(opOf(d, 'update contact').body.customFields.some(f => f.id === F.verdict), 'verdict missing on the fresh read -> re-sent');
d = decide({ newVerdict: V(), verdict: V(), source: 'call' });
ok(d.action === 'wait' && d.ops.length === 0 && d.retry === false, 'verdict already saved -> nothing to write, and waiting is final');
d = decide({ newVerdict: V(), source: 'call' });
ok(d.action === 'wait' && d.retry === true, 'save-first failed and we wait -> retry, never ok (codex review)');
d = decide({ mark: 'Gatekeeper', newVerdict: V({ call_outcome: 'gatekeeper', owner_reached: 'no' }), source: 'call' });
ok(d.action === 'apply' && d.retry === false, 'save-first failed but both values present -> applied, final');
d = decide({ mark: 'Gatekeeper', verdict: NEWER, newVerdict: V(), source: 'call' });
ok(d.verdict_call_id === 'call-2' && d.call_id === 'call-1' && d.notes.some(n => n.includes('older')) &&
   !(opOf(d, 'update contact') && opOf(d, 'update contact').body.customFields.some(f => f.id === F.verdict)),
   'older call on a retry: ignored, the newer verdict decides, the row recorded is still the older call');

// Codex's sequence: Capture's save-first FAILS, it reads, and its fallback save (F) succeeds after.
// Every interleaving must end with an applied run, or Capture reporting retry (then the sweep,
// which saves first, applies).
const simulateFailedSave = order => {
  const store = { id: 'C1', tags: ['screening'], customFields: [] };
  const set = (id, value) => { store.customFields = store.customFields.filter(f => f.id !== id).concat([{ id, value }]); };
  const snap = {};
  const act = { F: () => set(F.verdict, VJ), W: () => set(F.outcome, 'Owner - Busy'),
                RC: () => { snap.capture = JSON.parse(JSON.stringify(store)); }, RM: () => { snap.mark = JSON.parse(JSON.stringify(store)); } };
  order.forEach(step => act[step]());
  const call = (snapshot, input) => run(DECIDE, {}, { 'When Called by Screener': item(input), 'GHL: Get Contact': item({ contact: snapshot }),
    'GHL: Find Screener Opp': item({ opportunities: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: ST.attempt1, status: 'open', followers: [] } ] }) });
  const cap = call(snap.capture, { contact_id: 'C1', verdict_json: VJ, source: 'call', force: false });
  const mk = call(snap.mark, { contact_id: 'C1', verdict_json: '', source: 'mark', force: false });
  const sweep = call(JSON.parse(JSON.stringify(store)), { contact_id: 'C1', verdict_json: VJ, source: 'retry', force: false });
  return { cap, mk, sweep };
};
interleavings(['RC', 'F'], ['W', 'RM']).forEach(order => {
  const { cap, mk, sweep } = simulateFailedSave(order);
  const applied = [cap, mk].some(r => r.action === 'apply');
  ok(applied || cap.retry === true, 'failed save-first: ' + order.join(',') + ' -> applied, or Capture reports retry');
  ok(applied || sweep.result === 'Owner Verified', 'failed save-first: ' + order.join(',') + ' -> the retry sweep applies it');
});

// Retry flags: transient GHL failures must leave the call open (writeback_ok=false).
d = decide({ mark: 'Owner - Busy', verdict: V(), contact: { error: { message: 'Bad gateway', description: '502' } } });
ok(d.action === 'skip' && d.retry === true && d.reason.includes('502'), 'unreadable contact -> retry');
ok(decide({ mark: 'Owner - Busy', verdict: V(), tags: ['plumber'] }).retry === false, 'not tagged screening -> final, no retry');
d = run(DECIDE, {}, { 'When Called by Screener': item({ contact_id: 'C1', verdict_json: '', source: 'mark', force: false }),
  'GHL: Get Contact': item({ contact: { id: 'C1', tags: ['screening'], customFields: [ { id: F.outcome, value: 'Wrong Number' } ] } }),
  'GHL: Find Screener Opp': item({ error: { message: 'timeout' } }) });
ok(d.action === 'apply' && d.retry === true && !opOf(d, 'move stage'), 'opportunity search failed -> fields/tags written, stage retried later');

const REPORT = codeOf(compareWf, 'Report');
const report = (plan, sent, results) => new Function('$json', '$input', '$', REPORT)({}, { all: () => results.map(json => ({ json })) },
  n => n === 'Decide' ? { first: () => ({ json: plan }) } : { all: () => { if (!sent) throw new Error('unexecuted'); return sent.map(json => ({ json })); } })[0].json;
const plan = { contact_id: 'C1', action: 'apply', result: 'Gatekeeper', reason: 'gatekeeper', mismatch: false, notes: [], retry: false };
ok(report(plan, [{ label: 'move stage -> Gatekeeper' }], [{ id: 'O1' }]).ok === true, 'all requests succeeded -> ok');
const bad = report(plan, [{ label: 'add tags' }, { label: 'move stage -> Gatekeeper' }], [{}, { error: { message: '429 Too Many Requests' } }]);
ok(bad.ok === false && bad.failed.length === 1 && bad.failed[0].startsWith('move stage'), 'a failed request -> not ok, named');
ok(report(Object.assign({}, plan, { action: 'wait', retry: false }), null, [plan]).ok === true, 'nothing to write (Split Ops never ran) -> ok');
ok(report(Object.assign({}, plan, { action: 'skip', retry: true }), null, [plan]).ok === false, 'retryable skip -> not ok');

// Report names the call this run was about (the row Record Write-back updates).
ok(report(Object.assign({}, plan, { call_id: 'call-1' }), null, [plan]).call_id === 'call-1', 'Report carries call_id for the row update');

// Mark path: a failed compare reopens the contact's newest call row (codex review).
ok(JSON.stringify(conn(markWf, 'Screener: Compare Step')) === '[["Filter: compare failed"]]' &&
   JSON.stringify(conn(markWf, 'Filter: compare failed')) === '[["Find newest call row for contact"]]' &&
   JSON.stringify(conn(markWf, 'Find newest call row for contact')) === '[["Record Mark Failure"]]', 'mark failure -> newest call row');
const failFilter = markWf.nodes.find(n => n.name === 'Filter: compare failed').parameters.conditions.conditions[0];
ok(failFilter.leftValue === '={{ $json.ok }}' && failFilter.operator.operation === 'false', 'only a failed compare (ok=false) reopens the row');
const newestRow = markWf.nodes.find(n => n.name === 'Find newest call row for contact').parameters;
ok(newestRow.filters.conditions[0].keyName === 'contact_id' && newestRow.limit === 1 && newestRow.orderBy === true && newestRow.orderByDirection === 'DESC', 'newest row of that contact only');
ok(markWf.nodes.find(n => n.name === 'Record Mark Failure').parameters.columns.value.writeback_ok === '={{ false }}', 'Record Mark Failure sets writeback_ok=false');

// The durable retry (nothing re-sends GHL webhooks).
const retryWf = wf('Screener Write-back Retry.json');
const PICK = codeOf(retryWf, 'Pick newest per contact (48 h)');
const pick = rows => new Function('$json', '$input', '$', PICK)({}, { all: () => rows.map(json => ({ json })) }, () => { throw new Error('no $()'); }).map(i => i.json);
const nowIso = new Date().toISOString(), oldIso = new Date(Date.now() - 49 * 3600e3).toISOString();
const R = o => Object.assign({ call_id: 'c', contact_id: 'C1', ai_ok: true, writeback_ok: false, answered_at: '2026-09-21T17:00:00Z', received_at: nowIso }, o);
let picked = pick([R({ call_id: 'a' }), R({ call_id: 'b', answered_at: '2026-09-22T17:00:00Z' }), R({ call_id: 'x', contact_id: 'C2' })]);
ok(picked.length === 2 && picked.some(r => r.call_id === 'b') && !picked.some(r => r.call_id === 'a'), 'newest failed call per contact, once per sweep');
ok(pick([R({ received_at: oldIso })]).length === 0, 'older than 48 h -> left for a human');
ok(pick([R({ writeback_ok: true }), R({ ai_ok: false }), R({ writeback_ok: null })]).length === 0, 'only ai_ok=true AND writeback_ok=false rows');
const pend = retryWf.nodes.find(n => n.name === 'Get rows: write-back not finished').parameters;
ok(pend.matchType === 'allConditions' && pend.filters.conditions.some(c => c.keyName === 'writeback_ok' && c.condition === 'eq' && c.keyValue === '={{ false }}') &&
   pend.filters.conditions.some(c => c.keyName === 'ai_ok' && c.keyValue === '={{ true }}'), 'sweep reads writeback_ok = false (eq, not the MCP-dropped isTrue/isFalse)');
ok(JSON.stringify(conn(retryWf, 'Screener: Compare Step')) === '[["Record Write-back"]]' &&
   retryWf.nodes.find(n => n.name === 'Record Write-back').parameters.filters.conditions[0].keyValue === '={{ $json.call_id }}', 'sweep records each call on its own row');
ok(retryWf.nodes.find(n => n.name === 'Screener: Compare Step').parameters.workflowId.value === require('../workflows/screener/build/ids.json').compare, 'sweep uses the same Compare Step');
ok(codeOf(retryWf, 'Verdict For Contact') === codeOf(capture, 'Verdict For Contact'), 'sweep builds the verdict exactly as Capture does');

console.log('=== 9) Test rig (manual, hard-wired to the test contact) ===');
const rigWf = wf('Screener Test Rig.json');
const RIG = codeOf(rigWf, 'Rig Ops');
const rig = body => run(RIG, { body });
const throws = f => { try { f(); return false; } catch (e) { return true; } };
const rMark = rig({ action: 'mark', outcome: 'Owner - Busy' });
ok(rMark.ops.length === 1 && rMark.ops[0].body.customFields[0].id === F.outcome && rMark.ops[0].body.customFields[0].value === 'Owner - Busy', 'mark sets only Screener Outcome');
ok(throws(() => rig({ action: 'mark', outcome: 'Do Not Call' })), 'Do Not Call refused (DND on the demo record)');
ok(throws(() => rig({ action: 'mark', outcome: 'owner busy' })), 'misspelt outcome refused');
ok(throws(() => rig({ action: 'delete' })), 'unknown action refused');
ok(rig({ action: 'read' }).ops.length === 0, 'read writes nothing');
const rReset = rig({ action: 'reset' });
ok([rMark, rReset].every(r => r.ops.every(o => o.url.includes('/contacts/2Z5mwZe5RT4NQdNW85vj') || o.url.includes('/opportunities/FAstcBVvrgbpds2gQIV3'))),
   'every request targets Dana Happy or her screener opp, nothing else');
ok(rReset.ops.some(o => o.label.includes('Attempt 1') && o.body.pipelineStageId === ST.attempt1), 'reset: opp back to Attempt 1');
ok(JSON.stringify(rReset.ops.find(o => o.label.includes('followers')).body.followers.slice().sort()) === JSON.stringify(Object.values(U).sort()), 'reset: removes exactly the ten block followers');
ok(rReset.ops.find(o => o.label.includes('tags')).body.tags.length === 14 && !rReset.ops.find(o => o.label.includes('tags')).body.tags.includes('screening'),
   'reset: removes the 14 result tags, keeps screening');

console.log(`\n===== RESULT: ${PASS} passed, ${FAIL} failed =====`);
process.exit(FAIL ? 1 : 0);
