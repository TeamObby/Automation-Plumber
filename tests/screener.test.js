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
const COLUMNS = ['ai_ok','call_id','contact_id','contact_name','ghl_user_id','wavv_caller_id','answered_at','pt_block','pt_block_tag','duration_sec','recording_url','transcript','transcript_source','ai_call_outcome','ai_owner_reached','ai_confidence','ai_evidence_quote','ai_quote_verified','ai_owner_name','ai_model','ai_error','received_at','writeback_fail_ms'];
const norm = run(NORMALIZE, real);
const row = run(codeOf(capture, 'Build Row'), verdict({ call_outcome: 'owner', owner_reached: 'yes', evidence_quote: 'I own the shop' }),
  { 'Transcript Ready': item(norm) });
ok(JSON.stringify(Object.keys(row).sort()) === JSON.stringify(COLUMNS.slice().sort()), 'Build Row fields == data table columns');
const store = capture.nodes.find(x => x.name === 'Store: screener_calls (upsert on call_id)');
const WRITEBACK_COLS = ['writeback_ok', 'writeback_result'];   // set only by the Record nodes, never by Build Row
ok(row.writeback_fail_ms === 0, 'a new row starts with no write-back failure (0, never null: lt must be able to match)');
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
ok(JSON.stringify(conn(capture, 'Screener: Compare Step')) === JSON.stringify([['Write-back ok?']]) &&
   JSON.stringify(conn(capture, 'Write-back ok?')) === JSON.stringify([['Record Success (unless a newer failure)'], ['Record Failure']]), 'the compare result is recorded on the row, versioned');
const rec = capture.nodes.find(x => x.name === 'Record Success (unless a newer failure)');
ok(rec.parameters.operation === 'update' && rec.parameters.columns.value.writeback_ok === '={{ true }}' &&
   rec.parameters.filters.conditions.some(c => c.keyName === 'writeback_fail_ms' && c.condition === 'lt' && c.keyValue === '={{ $json.run_started_ms }}'),
   'a success lands only where the last failure is older than its run');
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
   JSON.stringify(conn(compareWf, 'GHL: Get Contact')) === '[["Stamp Read"]]' && JSON.stringify(conn(compareWf, 'Stamp Read')) === '[["GHL: Find Screener Opp"]]', 'Guard Read -> Save Verdict -> fresh Get Contact -> Stamp Read -> Decide');
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
  n => n === 'Decide' ? { first: () => ({ json: plan }) } : n === 'Plan Save' ? { first: () => ({ json: { run_started_ms: 1000 } }) }
    : { all: () => { if (!sent) throw new Error('unexecuted'); return sent.map(json => ({ json })); } })[0].json;
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
ok(JSON.stringify(conn(retryWf, 'Screener: Compare Step')) === '[["Write-back ok?"]]' &&
   ['Record Success (unless a newer failure)', 'Record Failure'].every(n => retryWf.nodes.find(x => x.name === n).parameters.filters.conditions[0].keyValue === '={{ $json.call_id }}'),
   'sweep records each call on its own row, versioned like Capture');
ok(retryWf.nodes.find(n => n.name === 'Screener: Compare Step').parameters.workflowId.value === require('../workflows/screener/build/ids.json').compare, 'sweep uses the same Compare Step');
ok(codeOf(retryWf, 'Verdict For Contact') === codeOf(capture, 'Verdict For Contact'), 'sweep builds the verdict exactly as Capture does');

console.log('=== 8b) Completion ordering: a late success never clears a newer failure (codex review) ===');
// Runs the REAL Record nodes' filters and values against a simulated screener_calls row.
const evalX = (v, $json, $, now) => typeof v === 'string' && v.startsWith('={{')
  ? new Function('$json', '$', 'Date', 'return (' + v.slice(3, -2) + ');')($json, $, { now: () => now }) : v;
const applyUpdate = (node, $json, rowState, now, $ = () => ({ first: () => ({ json: {} }) })) => {
  const p = node.parameters;
  const pass = p.filters.conditions.every(c => {
    const want = evalX(c.keyValue, $json, $, now), have = rowState[c.keyName];
    if (c.condition === 'eq') return have === want;
    if (c.condition === 'lt') return have != null && have < want;   // SQL: NULL never matches
    throw new Error('unmodelled condition ' + c.condition);
  });
  if (pass) for (const [k, v] of Object.entries(p.columns.value)) rowState[k] = evalX(v, $json, $, now);
  return pass;
};
const recOk = capture.nodes.find(n => n.name === 'Record Success (unless a newer failure)');
const recFail = capture.nodes.find(n => n.name === 'Record Failure');
const markFail = markWf.nodes.find(n => n.name === 'Record Mark Failure');
const vfcOf = cid => ({ first: () => ({ json: { call_id: cid } }) });
const cap$ = n => n === 'Verdict For Contact' ? vfcOf('c1') : n === 'Screener: Compare Step' ? { first: () => ({ json: { action: 'apply', reason: 'x', failed: ['move stage: 500'] } }) } : null;
// Codex's sequence: Capture reads at t=100 and waits (ok); Mark fails, recorded at t=200; Capture's
// completion lands at t=300.
let rowS = { call_id: 'c1', ai_ok: true, writeback_ok: null, writeback_fail_ms: 0 };
applyUpdate(markFail, { call_id: 'c1' }, rowS, 200, cap$);
applyUpdate(recOk, { ok: true, run_started_ms: 100, action: 'wait', reason: 'waiting' }, rowS, 300, cap$);
ok(rowS.writeback_ok === false && rowS.writeback_fail_ms === 200, 'codex sequence: the late Capture success does NOT clear the Mark failure');
ok(pick([R({ call_id: 'c1', received_at: new Date().toISOString(), writeback_ok: rowS.writeback_ok })]).length === 1, '... so the retry sweep still picks the call up');
// The retry run starts after the failure (t=400) and succeeds -> it may clear it.
applyUpdate(recOk, { ok: true, run_started_ms: 400, call_id: 'c1', action: 'apply', result: 'Gatekeeper', reason: 'gatekeeper' }, rowS, 450, cap$);
ok(rowS.writeback_ok === true, 'a success from a run that started after the failure clears it');
// Every order of: capture read (t), mark failure (f), capture record — only a read AFTER the failure may clear it.
[[100, 200, false], [250, 200, true], [200, 200, false]].forEach(([readAt, failAt, cleared]) => {
  const r = { call_id: 'c1', ai_ok: true, writeback_ok: null, writeback_fail_ms: 0 };
  applyUpdate(markFail, { call_id: 'c1' }, r, failAt, cap$);
  applyUpdate(recOk, { ok: true, run_started_ms: readAt, action: 'wait', reason: 'w' }, r, 900, cap$);
  ok(r.writeback_ok === (cleared ? true : false), `read at ${readAt}, failure at ${failAt} -> ${cleared ? 'cleared' : 'kept'}`);
});
// A failure always lands, whatever came before.
rowS = { call_id: 'c1', ai_ok: true, writeback_ok: true, writeback_fail_ms: 0 };
applyUpdate(recFail, { ok: false, run_started_ms: 50, action: 'apply', reason: 'x', failed: ['add tags: 500'] }, rowS, 60, cap$);
ok(rowS.writeback_ok === false && rowS.writeback_fail_ms === 60 && rowS.writeback_result.includes('add tags: 500'), 'a failure always lands and is stamped');
// A clean first run on a fresh row (fail_ms 0) records ok.
rowS = { call_id: 'c1', ai_ok: true, writeback_ok: null, writeback_fail_ms: 0 };
applyUpdate(recOk, { ok: true, run_started_ms: 10, action: 'wait', reason: 'w' }, rowS, 20, cap$);
ok(rowS.writeback_ok === true, 'fresh row, clean run -> ok');
ok(codeOf(compareWf, 'Plan Save').indexOf('run_started_ms: Date.now()') > -1 &&
   JSON.stringify(conn(compareWf, 'GHL: Guard Read')) === '[["Plan Save"]]' && JSON.stringify(conn(compareWf, 'Plan Save')) === '[["Save verdict first?"]]',
   'the version is taken in Plan Save, before the save and the decision read');
ok(report(plan, null, [plan]).run_started_ms === 1000, 'Report hands the version to the Record nodes');

console.log('=== 9) Test rig (manual, hard-wired to the test contact) ===');
const rigWf = wf('Screener Test Rig.json');
const RIG = codeOf(rigWf, 'Rig Ops');
const rig = (body, row = {}) => run(RIG, row, { 'Webhook (test rig)': item({ body }) });
const throws = f => { try { f(); return false; } catch (e) { return true; } };
const rMark = rig({ action: 'mark', outcome: 'Owner - Busy' });
ok(rMark.ops.length === 1 && rMark.ops[0].body.customFields[0].id === F.outcome && rMark.ops[0].body.customFields[0].value === 'Owner - Busy', 'mark sets only Screener Outcome');
ok(throws(() => rig({ action: 'mark', outcome: 'Do Not Call' })), 'Do Not Call refused (DND on the demo record)');
ok(throws(() => rig({ action: 'mark', outcome: 'owner busy' })), 'misspelt outcome refused');
ok(throws(() => rig({ action: 'delete' })), 'unknown action refused');
ok(JSON.stringify(conn(rigWf, 'Webhook (test rig)')) === '[["Test contact graduation"]]' && JSON.stringify(conn(rigWf, 'Test contact graduation')) === '[["Rig Ops"]]'
   && rigWf.nodes.find(n => n.name === 'Test contact graduation').parameters.filters.conditions[0].keyValue === '2Z5mwZe5RT4NQdNW85vj:FAstcBVvrgbpds2gQIV3',
   'the rig reads only the test contact graduation row');
ok(rig({ action: 'read' }).ops.length === 0, 'read writes nothing');
const rReset = rig({ action: 'reset' });
ok([rMark, rReset].every(r => r.ops.every(o => o.url.includes('/contacts/2Z5mwZe5RT4NQdNW85vj') || o.url.includes('/opportunities/FAstcBVvrgbpds2gQIV3'))),
   'every request targets Dana Happy or her screener opp, nothing else');
ok(rReset.ops.some(o => o.label.includes('Attempt 1') && o.body.pipelineStageId === ST.attempt1 && o.body.status === 'open'), 'reset: opp open again, back to Attempt 1 (undoes a graduation close)');
ok(rReset.ops.some(o => o.method === 'POST' && o.url.endsWith('/tags') && JSON.stringify(o.body.tags) === '["screening"]'), 'reset: screening tag back (Graduate removes it)');
const GROW = { grad_key: '2Z5mwZe5RT4NQdNW85vj:FAstcBVvrgbpds2gQIV3', kevin_opp_id: 'K1', created_new: true };
const rUngrad = rig({ action: 'ungraduate' }, GROW);
ok(rUngrad.ops[0].method === 'DELETE' && rUngrad.ops[0].url.endsWith('/opportunities/K1') && rUngrad.ops.length === rReset.ops.length + 1, 'ungraduate: deletes the logged Kevin opp, then a full reset');
ok(rUngrad.ops.filter(o => o.url.includes('/opportunities/') && !o.url.includes('FAstcBVvrgbpds2gQIV3')).length === 1, 'ungraduate: the only other record it touches is that one opp');
ok(throws(() => rig({ action: 'ungraduate' }, {})), 'ungraduate with no graduation row -> refused');
ok(throws(() => rig({ action: 'ungraduate' }, Object.assign({}, GROW, { created_new: false }))), 'ungraduate of a REUSED Kevin opp -> refused (it existed before Graduate)');
ok(throws(() => rig({ action: 'ungraduate' }, Object.assign({}, GROW, { grad_key: 'OTHER:O1' }))), 'ungraduate of another contact row -> refused');
ok(throws(() => rig({ action: 'ungraduate' }, Object.assign({}, GROW, { kevin_opp_id: 'FAstcBVvrgbpds2gQIV3' }))), 'ungraduate never deletes the screener opp');
ok(JSON.stringify(rReset.ops.find(o => o.label.includes('followers')).body.followers.slice().sort()) === JSON.stringify(Object.values(U).sort()), 'reset: removes exactly the ten block followers');
ok(rReset.ops.find(o => o.label.includes('tags')).body.tags.length === 14 && !rReset.ops.find(o => o.label.includes('tags')).body.tags.includes('screening'),
   'reset: removes the 14 result tags, keeps screening');

console.log('=== 10) Attempt Counter (item 5: the Attempt ladder) ===');
const ctr = wf('Screener Attempt Counter.json');
const naWf = wf('Screener No Answer.json'), dispWf = wf('Screener WAVV Disposition.json');
const NNA = codeOf(naWf, 'Normalize No Answer'), NDISP = codeOf(dispWf, 'Normalize Disposition');
const CTR_ID = require('../workflows/screener/build/ids.json').counter;
[[naWf, 'screener-no-answer'], [dispWf, 'screener-disposition']].forEach(([w, path]) => {
  const hookN = w.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  const call = w.nodes.find(n => n.name === 'Screener: Attempt Counter');
  ok(hookN.parameters.path === path && call.parameters.workflowId.value === CTR_ID &&
     ['contact_id', 'event', 'wavv_call_id', 'event_key', 'at_ms', 'received_at'].every(k => call.parameters.workflowInputs.value[k] === '={{ $json.' + k + ' }}'),
     path + ' -> Screener: Attempt Counter with every event field');
});
ok(ctr.nodes.filter(n => n.type === 'n8n-nodes-base.webhook').length === 0 &&
   JSON.stringify(conn(ctr, 'When Called (attempt event)')) === '[["Event"]]', 'the counter is a sub-workflow (one testable webhook per workflow)');
const note = d => '[ WAVV: 019f71fc-83da-7bb5 ] To: (805) 265-3731 (363) From: (805) 572-7879 Duration: 8 seconds Disposition: ' + d + ' Tag: wavv-x (15) Note: Auto-disposition';
const nd = d => run(NDISP, { body: { contact_id: 'C1', customData: { note: note(d) } } });
ok(nd('Voicemail').event === 'voicemail' && nd('Voicemail').event_key === 'wavv:019f71fc-83da-7bb5', 'Voicemail note -> an attempt, keyed on the WAVV call id');
ok(nd('Bad Number').event === 'bad-number', 'Bad Number note -> bad-number');
ok(nd('No Answer').event === '' && nd('Canceled').event === '', 'No Answer / Canceled notes ignored (the no-answer webhook counts those; no double count)');
ok(nd('Cold Good').event === '' && nd('Gatekeeper Good').event === '', 'answered-call dispositions ignored (the Compare Step owns those)');
ok(run(NDISP, { body: { contact_id: 'C1', customData: { note: 'just a note' } } }).event === '', 'non-WAVV note ignored');
const na = run(NNA, { body: { contact_id: 'C1', full_name: 'X' } });
ok(na.event === 'no-answer' && na.contact_id === 'C1' && na.event_key.startsWith('na:C1:') && na.at_ms > 0, 'no-answer webhook -> event with a time-stamped key');
const EVT = codeOf(ctr, 'Event');
const evt = j => new Function('$json', '$input', '$', EVT)({}, { first: () => ({ json: j }) }, () => null);
ok(evt({ contact_id: 'C1', event: '' }).length === 0 && evt({ contact_id: '', event: 'voicemail' }).length === 0 && evt({ contact_id: 'C1', event: 'voicemail' }).length === 1, 'only a countable event for a known contact goes on');

// Dedupe
const DED = codeOf(ctr, 'Attempt Dedupe');
const ded = (e, rows) => new Function('$json', '$input', '$', DED)({}, { all: () => rows.map(json => ({ json })) }, () => ({ first: () => ({ json: e }) }))[0].json;
const NOW = 1790000000000;
const eNa = { contact_id: 'C1', event: 'no-answer', event_key: 'na:C1:' + NOW, at_ms: NOW };
ok(ded(eNa, [{}]).route === 'count', 'first event for the contact -> count');
ok(ded(eNa, [{ event_key: 'na:C1:x', event: 'no-answer', at_ms: NOW - 10000, ok: true }]).route === 'duplicate', 'no-answer 10 s after another -> the same dial delivered twice');
ok(ded(eNa, [{ event_key: 'na:C1:x', event: 'no-answer', at_ms: NOW - 120000, ok: true }]).route === 'count', 'no-answer 2 min after the last -> a new dial');
ok(ded(eNa, [{ event_key: 'wavv:z', event: 'voicemail', at_ms: NOW - 5000, ok: true }]).route === 'count', 'a voicemail just before does not swallow a no-answer');
const eVm = { contact_id: 'C1', event: 'voicemail', event_key: 'wavv:abc', at_ms: NOW };
ok(ded(eVm, [{ event_key: 'wavv:abc', ok: true, attempt_no: 2 }]).route === 'duplicate', 'same WAVV call, written back -> duplicate');
const again = ded(eVm, [{ event_key: 'wavv:abc', ok: false, attempt_no: 2 }]);
ok(again.route === 'count' && again.stored_attempt_no === 2, 'same WAVV call, write-back failed -> retried with the SAME attempt number');

// Ladder
const LAD = codeOf(ctr, 'Ladder');
const LS = { a1: '7ff9193f-1e0a-4c93-9626-a6aab22b666b', a2: 'd3d8862e-bc2e-443f-97e6-f77e577ac09e', a3: 'abb54fb0-dbfc-44d9-aa21-796b91b7540b',
  a4: 'ec53d2ba-8322-45d6-9d60-283cc4fc016e', ex: 'c1db8172-84bf-45a1-8f0e-5625157574a5', dq: '65f9e1b4-8688-456d-845e-ebe0781101b9' };
const FA = 'vcqKnq23gN5wIIHqRww4';
const lad = ({ event = 'no-answer', attempts, stored = null, stage = LS.a1, fields = [], tags = ['screening'], contact, opps } = {}) => {
  const cfs = fields.slice(); if (attempts != null) cfs.push({ id: FA, value: attempts });
  return run(LAD, {}, {
    'Attempt Dedupe': item({ contact_id: 'C1', event, event_key: 'k', at_ms: NOW, stored_attempt_no: stored }),
    'GHL: Get Contact': item(contact !== undefined ? contact : { contact: { id: 'C1', tags, customFields: cfs } }),
    'GHL: Find Screener Opp': item(opps !== undefined ? opps : { opportunities: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: stage, status: 'open' } ] })
  });
};
const stageOp = l => { const o = l.ops.find(x => x.label.startsWith('move stage')); return o ? o.body.pipelineStageId : ''; };
const attOp = l => { const o = l.ops.find(x => x.label.startsWith('Screen Attempts')); return o ? o.body.customFields[0] : null; };
[[undefined, LS.a2, 1], [1, LS.a3, 2], [2, LS.a4, 3], [3, LS.ex, 4]].forEach(([before, want, n]) => {
  const l = lad({ attempts: before });
  ok(l.action === 'apply' && l.attempt_no === n && attOp(l).id === FA && attOp(l).value === n && stageOp(l) === want,
     `dial ${n} unanswered -> Screen Attempts ${n}, stage ${want === LS.ex ? 'Exhausted' : 'Attempt ' + (n + 1)}`);
});
ok(stageOp(lad({ event: 'voicemail', attempts: 1 })) === LS.a3, 'voicemail counts like a no-answer');
ok(stageOp(lad({ event: 'bad-number', attempts: 0 })) === LS.dq && lad({ event: 'bad-number', attempts: 0 }).attempt_no === 1, 'bad number -> Disqualified (and the dial is counted)');
ok(lad({ attempts: 2, stored: 2 }).attempt_no === 2, 'a retried event reuses its stored attempt number (never +1 twice)');
ok(lad({ tags: ['plumber'] }).action === 'skip', 'not tagged screening -> skip');
ok(lad({ contact: { error: { message: '502' } } }).retry === true, 'contact unreadable -> skip, retryable');
ok(lad({ fields: [{ id: F.date, value: '2026-09-24' }] }).action === 'skip', 'already screened (Date Screened set) -> the ladder leaves it alone');
ok(lad({ stage: LS.ex }).action === 'skip' && lad({ stage: 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f' }).action === 'skip', 'terminal stage -> skip');
ok(lad({ opps: { error: { message: 'timeout' } } }).retry === true, 'opportunity search failed -> retryable');
const noOpp = lad({ opps: { opportunities: [] }, attempts: 0 });
ok(noOpp.action === 'apply' && !stageOp(noOpp) && attOp(noOpp).value === 1, 'no screener opp -> only Screen Attempts written');
// The unmarked answered call (spec §4.1)
const human = V({ call_outcome: 'gatekeeper', owner_reached: 'no' });
let lf = lad({ attempts: 0, fields: [{ id: F.verdict, value: JSON.stringify(human) }] });
ok(lf.action === 'force' && lf.force_compare && !stageOp(lf) && attOp(lf).value === 1, 'dial after an answered call nobody marked -> force the compare (it owns the stage)');
lf = lad({ attempts: 0, fields: [{ id: F.verdict, value: JSON.stringify(V({ call_outcome: 'voicemail', owner_reached: 'no' })) }] });
ok(lf.action === 'apply' && !lf.force_compare, 'a voicemail verdict is not an answered human -> normal ladder');
lf = lad({ attempts: 0, fields: [{ id: F.verdict, value: JSON.stringify(human) }, { id: F.outcome, value: 'Gatekeeper' }] });
ok(!lf.force_compare, 'marked call -> no force');
ok(lad({ attempts: 0 }).ops.every(o => o.url.includes('/contacts/C1') || o.url.includes('/opportunities/O1')), 'ladder writes only this contact and its screener opp');
// Codex review: Bad Number wins over the unmarked-call force.
lf = lad({ event: 'bad-number', attempts: 0, fields: [{ id: F.verdict, value: JSON.stringify(human) }] });
ok(lf.action === 'apply' && !lf.force_compare && stageOp(lf) === LS.dq, 'bad number after an unmarked answered call -> Disqualified, not the forced compare');
// Codex review: a retry of a half-failed event repairs the count even once the lead is terminal.
lf = lad({ stored: 3, attempts: 2, stage: LS.ex });
ok(lf.action === 'repair' && attOp(lf).value === 3 && !stageOp(lf), 'retry after the stage landed but the count failed -> count repaired, stage untouched');
lf = lad({ stored: 2, attempts: 1, fields: [{ id: F.date, value: '2026-09-24' }] });
ok(lf.action === 'repair' && attOp(lf).value === 2 && !stageOp(lf), 'retry on a lead decided since -> count repaired, stage never moved back');
ok(lad({ stored: 2, tags: ['plumber'] }).attempt_no === 2, 'a retry that skips keeps its attempt number (never logged as null)');
ok(lad({ stage: LS.ex }).action === 'skip' && lad({ stage: LS.ex }).ops.length === 0, 'a NEW event on a terminal lead still writes nothing');
const forceNode = ctr.nodes.find(n => n.name === 'Screener: Compare Step');
ok(forceNode.parameters.workflowInputs.value.force === true && forceNode.parameters.workflowInputs.value.source === 'ladder' &&
   forceNode.parameters.workflowId.value === require('../workflows/screener/build/ids.json').compare, 'the force call goes to the shared Compare Step with force=true');

// Log row
const LOG = codeOf(ctr, 'Log Row');
const logOf = (l, nodes) => new Function('$json', '$input', '$', LOG)({}, {}, n => {
  if (n === 'Ladder') return { first: () => ({ json: l }) };
  if (!(n in nodes)) throw new Error('unexecuted'); return { first: () => ({ json: nodes[n] }) };
})[0].json;
const base = { event_key: 'k', contact_id: 'C1', event: 'no-answer', at_ms: NOW, received_at: 'r', attempt_no: 1, action: 'apply', result_stage: 'Attempt 2', reason: 'no-answer #1', retry: false, force_compare: false };
ok(logOf(base, { 'Ladder Report': { failed: [] } }).ok === true, 'applied cleanly -> ok');
const lr = logOf(Object.assign({}, base, { action: 'repair', attempt_no: 3, result_stage: '' }), { 'Ladder Report': { failed: [] } });
ok(lr.ok === true && lr.attempt_no === 3, 'a successful repair logs ok with its attempt number');
const lb = logOf(base, { 'Ladder Report': { failed: ['move stage -> Attempt 2: 500'] } });
ok(lb.ok === false && lb.reason.includes('500'), 'a failed request -> ok false, named');
ok(logOf(Object.assign({}, base, { action: 'skip', retry: true, attempt_no: null }), {}).ok === false, 'retryable skip -> ok false');
ok(logOf(Object.assign({}, base, { action: 'skip', attempt_no: null, reason: 'not tagged' }), {}).ok === true, 'final skip -> ok (nothing to do)');
const lc = logOf(Object.assign({}, base, { action: 'force', force_compare: true, result_stage: '' }), { 'Ladder Report': { failed: [] }, 'Screener: Compare Step': { ok: true, result: 'Not Sure', reason: 'nothing marked' } });
ok(lc.ok === true && lc.result_stage === 'Not Sure' && lc.reason.includes('compare: nothing marked'), 'forced compare -> its result is logged');
ok(logOf(Object.assign({}, base, { action: 'force', force_compare: true }), { 'Ladder Report': { failed: [] }, 'Screener: Compare Step': { ok: false } }).ok === false, 'forced compare failed -> ok false');
const LOGCOLS = ['event_key','contact_id','event','wavv_call_id','attempt_no','action','result_stage','ok','reason','at_ms','received_at'];
ok(JSON.stringify(Object.keys(lc).sort()) === JSON.stringify(LOGCOLS.slice().sort()), 'Log Row fields == screener_attempts columns');
ok(JSON.stringify(ctr.nodes.find(n => n.name.startsWith('Store: screener_attempts')).parameters.columns.schema.map(c => c.id).sort()) === JSON.stringify(LOGCOLS.slice().sort()), 'upsert schema == screener_attempts columns');
ok(JSON.stringify(conn(ctr, 'Skip?')) === '[["Log Row"],["Split Ladder Ops"]]' && JSON.stringify(conn(ctr, 'Unmarked answered call?')) === '[["Screener: Compare Step"],["Log Row"]]', 'every path ends in the log');

console.log('=== 11) Graduate (item 6: into Kevin\'s pipeline) ===');
const gradWf = wf('Screener Graduate.json'), sweepWf = wf('Screener Graduate Sweep.json');
const OV = 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f', SCR = 'CvDwpavqkHSRhg5Bn3L4';
const PICK_G = codeOf(sweepWf, 'Pick ready leads (10 min grace)');
const ago = m => new Date(Date.now() - m * 60000).toISOString();
const pickG = opps => new Function('$json', '$input', '$', PICK_G)({}, { first: () => ({ json: { opportunities: opps } }) }, () => null).map(i => i.json);
ok(sweepWf.nodes.find(n => n.name === 'Pick ready leads (10 min grace)').parameters.mode === 'runOnceForAllItems', 'pick returns a list, so it runs once for all items');
const so = o => Object.assign({ id: 'O1', contactId: 'C1', pipelineId: SCR, pipelineStageId: OV, status: 'open', lastStageChangeAt: ago(30) }, o);
ok(pickG([so()]).length === 1 && pickG([so()])[0].screener_opp_id === 'O1', 'Owner Verified for 30 min -> graduates');
ok(pickG([so({ lastStageChangeAt: ago(3) })]).length === 0, 'Owner Verified for 3 min -> waits (the screener can still correct the mark)');
ok(pickG([so({ pipelineStageId: 'f83777fa-1dc0-4163-aa84-ef501126d82b' }), so({ status: 'won' }), so({ pipelineId: 'OTHER' })]).length === 0, 'other stages, closed opps, other pipelines -> never');

const GD = codeOf(gradWf, 'Graduation Plan');
const gplan = ({ tags = ['screening', 'owner-confirmed', 'screened-pt-10-11', 'wavv-none'], email = '', opps, contact } = {}) => run(GD, {}, {
  'When Called (graduate)': item({ contact_id: 'C1', screener_opp_id: 'O1' }),
  'GHL: Get Contact': item(contact !== undefined ? contact : { contact: { id: 'C1', tags, email, companyName: 'Happy Plumbing' } }),
  'GHL: All Opps for Contact': item(opps !== undefined ? opps : { opportunities: [ so() ] })
});
let g = gplan();
ok(g.action === 'graduate' && g.create.pipelineId === '9E6y34DlG1Imr8FV42RV' && g.create.pipelineStageId === '060f44a8-4cd8-4561-8c84-7150bfd57498', 'no email -> Cold Outbound Call / Day 1 Call A (Import Contact To New rule)');
ok(gplan({ email: 'a@b.com' }).create.pipelineId === 'O7LMZpDOFM2SYO65twC5' && gplan({ email: 'a@b.com' }).create.pipelineStageId === 'f6aa7e0f-6b83-4a7b-b8b9-620753554b3a', 'email -> Client Acquisition / New');
ok(g.create.contactId === 'C1' && g.create.name === 'Happy Plumbing' && g.create.locationId === 'rzaMhqeo2apNI1p6DG5z' && g.create.status === 'open', 'the new opportunity: this contact, company name, open');
ok(g.pt_block === 'PT 10-11' && g.block_user === 'T4p1bK3yo6Bl14OK1LP3', 'block tag -> the PT 10-11 follower for Kevin\'s board');
ok(JSON.stringify(g.remove_tags.slice().sort()) === '["screening","wavv-none"]', 'removes screening and leftover wavv tags, keeps owner-confirmed + block tag');
g = gplan({ opps: { opportunities: [ so(), { id: 'K9', pipelineId: 'O7LMZpDOFM2SYO65twC5', status: 'open' } ] } });
ok(g.action === 'graduate' && g.create === null && g.kevin_opp_id === 'K9', 'already has an open Kevin opportunity (re-screen trap / retry) -> reused, nothing created');
ok(gplan({ opps: { opportunities: [ so(), { id: 'K8', pipelineId: 'O7LMZpDOFM2SYO65twC5', status: 'lost' } ] } }).create !== null, 'a closed Kevin opportunity does not count');
g = gplan({ opps: { opportunities: [ so(), { id: 'D1', pipelineId: 'SOME-DEMO-PIPELINE', status: 'open' } ] } });
ok(g.create !== null && g.kevin_opp_id === '', 'an open opportunity in an unrelated pipeline (e.g. a demo) is NOT reused: Kevin gets his own');
['1A1RkYaL93s2rqbQ3Opi', '3onA8GkJnSwgzIGTGSpI', 'TwW6o0JdPXUlcwvX0EvI', 'smoNRUaagZYOElKFLwtp', '9E6y34DlG1Imr8FV42RV'].forEach(pid =>
  ok(gplan({ opps: { opportunities: [ so(), { id: 'KX', pipelineId: pid, status: 'open' } ] } }).kevin_opp_id === 'KX', 'open opp in Kevin pipeline ' + pid + ' -> reused'));
g = gplan({ opps: { opportunities: [ so(), { id: 'MR1', pipelineId: 'OOu5TjgalfGZElEIoSbq', status: 'open' } ] } });
ok(g.create !== null && g.kevin_opp_id === '', 'an open Manual Review Needed opp is a task, not a handoff: a real opportunity is still created');
ok(gplan({ tags: ['screening'] }).action === 'skip', 'not owner-confirmed -> skip');
ok(gplan({ opps: { opportunities: [ so({ pipelineStageId: '0c160182-e74d-4ace-9d3b-c4404043ef4b' }) ] } }).action === 'skip', 'corrected away from Owner Verified since the sweep -> skip');
ok(gplan({ contact: { error: { message: '502' } } }).retry === true && gplan({ opps: { error: { message: 'x' } } }).retry === true, 'unreadable contact / opp search failed -> retry');
ok(gplan({ tags: ['screening', 'owner-confirmed'] }).block_user === '', 'no block tag -> no follower (answered outside PT 06-16)');

const GO = codeOf(gradWf, 'Graduation Ops');
const gops = (plan, created) => new Function('$json', '$input', '$', GO)({}, {}, n => {
  if (n === 'Graduation Plan') return { first: () => ({ json: plan }) };
  if (n === 'GHL: Create Kevin Opp') { if (created === undefined) throw new Error('unexecuted'); return { first: () => ({ json: created }) }; }
}).map(i => i.json);
let go = gops(gplan(), { opportunity: { id: 'K1' } });
ok(go.every(o => o.kevin_opp_id === 'K1') && go[0].url.endsWith('/opportunities/K1/followers') && go[0].body.followers[0] === 'T4p1bK3yo6Bl14OK1LP3', 'follower goes on the NEW Kevin opportunity');
ok(!go.some(o => o.url.endsWith('/opportunities/O1')), 'Graduation Ops never closes the screener opportunity (Close Gate does, after every write succeeded)');
ok(go.some(o => o.label === 'clear screener as owner' && o.body.assignedTo === null), 'the screener stops owning the contact');
go = gops(gplan({ opps: { opportunities: [ so(), { id: 'K9', pipelineId: 'O7LMZpDOFM2SYO65twC5', status: 'open' } ] } }));
ok(go[0].kevin_opp_id === 'K9', 'reused opportunity: follower on the existing one');
go = gops(gplan(), { error: { message: '422 duplicate' } });
ok(go.length === 1 && go[0].method === 'SKIP' && go[0].error_text.includes('422'), 'create failed -> no writes at all (lead stays in Owner Verified for the next sweep)');
ok(JSON.stringify(conn(gradWf, 'Kevin opp exists?')) === '[["GHL: Graduation Apply"],["Log Graduation"]]', 'a failed create goes straight to the log');
ok(JSON.stringify(conn(gradWf, 'GHL: Graduation Apply')) === '[["Close Gate"]]' && JSON.stringify(conn(gradWf, 'Close Gate')) === '[["All writes OK?"]]'
  && JSON.stringify(conn(gradWf, 'All writes OK?')) === '[["GHL: Close Screener Opp"],["Log Graduation"]]' && JSON.stringify(conn(gradWf, 'GHL: Close Screener Opp')) === '[["Log Graduation"]]',
  'writes -> Close Gate -> close only when all succeeded; both ends reach the log');

const GG = codeOf(gradWf, 'Close Gate');
const ggate = (plan, sent, res) => new Function('$json', '$input', '$', GG)({}, { all: () => res.map(json => ({ json })) }, n => {
  if (n === 'Graduation Plan') return { first: () => ({ json: plan }) };
  if (n === 'Graduation Ops') return { all: () => sent.map(json => ({ json })) };
})[0].json;
const gpl = gplan(), gsent = gops(gpl, { opportunity: { id: 'K1' } });
let gt = ggate(gpl, gsent, gsent.map(() => ({})));
ok(gt.close === true && gt.url.endsWith('/opportunities/O1') && gt.body.status === 'won', 'every write succeeded -> close the screener opportunity (won)');
gt = ggate(gpl, gsent, [{}, { error: { message: '500' } }, {}]);
ok(gt.close === false && gt.failed[0] === 'remove screening + wavv tags', 'tag removal failed -> screener opportunity stays open for the next sweep');
gt = ggate(gpl, gsent, [{ error: { message: '404' } }, {}, {}]);
ok(gt.close === false && gt.failed[0] === 'block follower on Kevin opp', 'follower failed -> stays open');
ok(ggate(gpl, gsent, [{}]).close === false, 'fewer results than writes -> not confirmed, stays open');

const GL = codeOf(gradWf, 'Log Graduation');
const glog = (plan, sent, res, gate, closeRes) => new Function('$json', '$input', '$', GL)({}, {}, n => {
  if (n === 'Graduation Plan') return { first: () => ({ json: plan }) };
  const v = { 'Graduation Ops': sent, 'GHL: Graduation Apply': res, 'Close Gate': gate && [gate], 'GHL: Close Screener Opp': closeRes && [closeRes] }[n];
  if (!v) throw new Error('unexecuted'); return { all: () => v.map(json => ({ json })) };
})[0].json;
const pl = gplan();
let gl = glog(pl, gsent, [{}, {}, {}], { close: true, failed: [] }, {});
ok(gl.ok === true && gl.kevin_opp_id === 'K1' && gl.created_new === true && gl.grad_key === 'C1:O1', 'clean graduation logged');
gl = glog(pl, gsent, [{}, {}, {}], { close: true, failed: [] }, { error: { message: '500' } });
ok(gl.ok === false && gl.reason.includes('close screener opportunity (won): 500'), 'failed close -> not ok, named');
gl = glog(pl, gsent, [{}, { error: { message: '500' } }, {}], { close: false, failed: ['remove screening + wavv tags'] }, null);
ok(gl.ok === false && gl.reason.includes('remove screening + wavv tags: 500') && gl.reason.includes('screener opportunity left open'), 'failed write -> not ok, close skipped, both named');
ok(glog(pl, gsent, [{}, {}, {}], null, null).ok === false, 'writes done but never closed -> not ok (a graduation counts only once closed)');
gl = glog(pl, gops(pl, { error: { message: '422 duplicate' } }), null);
ok(gl.ok === false && gl.reason.includes('create Kevin opp: 422'), 'failed create -> not ok, named');
ok(glog(gplan({ tags: ['screening'] }), null, null).ok === true, 'final skip -> ok');
{ const GLF = codeOf(gradWf, 'Log Graduation');
  const glf = (prev, closeRes) => new Function('$json', '$input', '$', GLF)({}, {}, n => {
    if (n === 'Graduation Plan') return { first: () => ({ json: gplan() }) };
    if (n === 'Previous graduation') return { first: () => ({ json: prev }) };
    const v = { 'Graduation Ops': gsent, 'GHL: Graduation Apply': [{}, {}, {}], 'Close Gate': [{ close: true, failed: [] }], 'GHL: Close Screener Opp': [closeRes] }[n];
    return { all: () => v.map(json => ({ json })) };
  })[0].json;
  const first = glf({}, { error: { message: '500' } });
  ok(first.ok === false && first.first_failed_at === first.at, 'first failure: first_failed_at = now');
  ok(glf({ ok: false, first_failed_at: '2026-09-20T00:00:00.000Z' }, { error: { message: '500' } }).first_failed_at === '2026-09-20T00:00:00.000Z', 'a retry that fails again keeps the FIRST failure time (codex: at is refreshed every retry)');
  ok(glf({ ok: false, first_failed_at: '2026-09-20T00:00:00.000Z' }, {}).first_failed_at === '', 'a graduation that finally succeeds clears it');
  ok(JSON.stringify(conn(gradWf, 'When Called (graduate)')) === '[["Previous graduation"]]' && JSON.stringify(conn(gradWf, 'Previous graduation')) === '[["GHL: Get Contact"]]', 'Graduate reads its previous row first'); }
const GRADCOLS = ['grad_key','contact_id','screener_opp_id','kevin_opp_id','kevin_pipeline','created_new','pt_block','action','ok','reason','at','first_failed_at'];
ok(JSON.stringify(Object.keys(gl).sort()) === JSON.stringify(GRADCOLS.slice().sort()), 'Log Graduation fields == screener_graduations columns');
ok(sweepWf.nodes.find(n => n.name === 'Screener: Graduate').parameters.workflowId.value === require('../workflows/screener/build/ids.json').graduate, 'the sweep calls Screener: Graduate');

console.log('=== 12) Screener log in Supabase (item 7a) ===');
const SQL = fs.readFileSync(path.join(__dirname, '../supabase/screener_log.sql'), 'utf8');
const SQLCOLS = (SQL.match(/create table if not exists public\.screener_log \(([\s\S]*?)\n\);/) || [, ''])[1]
  .split('\n').map(l => (l.trim().match(/^([a-z_]+)\s+(text|timestamptz|integer|bigint|numeric|boolean)/) || [])[1]).filter(Boolean);
ok(SQLCOLS.length === 24 && SQLCOLS.includes('event_key') && SQLCOLS.includes('match') && SQLCOLS.includes('decided_ms'), 'SQL file parsed: 24 screener_log columns');
const EVENTS = (SQL.match(/event in \(([^)]*)\)/) || [, ''])[1].split(',').map(x => x.trim().replace(/'/g, ''));
const cmpWf = wf('Screener Compare Step.json'), ctrWf = wf('Screener Attempt Counter.json');
[[cmpWf, 'Report', 'Find call row'], [ctrWf, 'Store: screener_attempts (upsert on event_key)', 'Build Log Row']].forEach(([w, from, next]) => {
  ok(JSON.stringify(conn(w, from)) === JSON.stringify([[next]]), w.name + ': ' + from + ' -> ' + next);
  ok(JSON.stringify(conn(w, 'Log it?')) === '[["Supabase: screener_log"],["Return"]]' && JSON.stringify(conn(w, 'Supabase: screener_log')) === '[["Log write failed?"]]'
     && JSON.stringify(conn(w, 'Log write failed?')) === '[["Queue Pending Log"],["Return"]]' && JSON.stringify(conn(w, 'Queue Pending Log')) === '[["Store: screener_log_pending"]]'
     && JSON.stringify(conn(w, 'Store: screener_log_pending')) === '[["Return"]]' && !w.connections['Return'],
     w.name + ': log it -> Supabase -> (failed -> queue) -> Return; Return is the last node');
  const up = w.nodes.find(n => n.name === 'Supabase: screener_log');
  ok(up.onError === 'continueRegularOutput' && up.parameters.nodeCredentialType === 'supabaseApi' && /\/rest\/v1\/rpc\/screener_log_upsert$/.test(up.parameters.url)
     && up.parameters.jsonBody.includes('r: $json.row'), w.name + ': writes only through the versioned screener_log_upsert; a failure never fails the run');
  ok(w.nodes.find(n => n.name === 'Store: screener_log_pending').parameters.dataTableId.value === 'qKv7RxgTDsqb1plo', w.name + ': a failed write is queued in screener_log_pending');
  const RET = codeOf(w, 'Return');
  const back = new Function('$json', '$', RET)({}, n => { if (n !== from) throw new Error('wrong node ' + n); return { all: () => [{ json: { ok: true, result: 'Owner Verified' }, pairedItem: { item: 0 } }] }; });
  ok(back.length === 1 && back[0].json.ok === true && back[0].json.result === 'Owner Verified', w.name + ': Return hands back the ' + from + ' output unchanged');
});
ok(cmpWf.nodes.find(n => n.name === 'Find call row').alwaysOutputData === true, 'a missing call row does not stop the log');

const LCR = codeOf(cmpWf, 'Build Log Row');
const V1 = { call_id: 'CALL1', answered_at: '2026-09-25T17:10:00.000Z', pt_block: 'PT 10-11', ghl_user_id: 'U1', call_outcome: 'owner', owner_reached: 'yes', confidence: 0.9, quote_verified: true };
const CROW = { call_id: 'CALL1', answered_at: '2026-09-25T17:10:00.000Z', ghl_user_id: 'U1', pt_block: 'PT 10-11', duration_sec: 42, recording_url: 'https://rec', transcript: 'Hi, this is Bob, the owner.',
  ai_call_outcome: 'owner', ai_owner_reached: 'yes', ai_confidence: 0.9, ai_quote_verified: true };
const lcr = ({ plan, verdictIn = V1, stored = V1, crow = CROW, contact } = {}) => {
  const out = run(LCR, {}, {
    'Decide': item(Object.assign({ contact_id: 'C1', call_id: '', action: 'apply', result: 'Owner Verified', mismatch: false, reason: 'screener and AI agree: owner', notes: [], mark: 'Owner - Busy', verdict_call_id: 'CALL1' }, plan)),
    'When Called by Screener': item({ contact_id: 'C1', verdict_json: verdictIn ? JSON.stringify(verdictIn) : '' }),
    'GHL: Get Contact': item({ contact: contact || { id: 'C1', companyName: 'Happy Plumbing', customFields: [ { id: 'boOwqb5qGOmbWBopWvTv', value: stored ? JSON.stringify(stored) : '' }, { id: 'vcqKnq23gN5wIIHqRww4', value: '2' } ] } }),
    'Find call row': item(crow)
  });
  return JSON.parse(JSON.stringify(out[0].json));   // what n8n sends: undefined keys dropped
};
let slr = lcr();
ok(slr.log === true && slr.row.event_key === 'call:CALL1' && slr.row.event === 'call' && slr.row.match === true && slr.row.result_stage === 'Owner Verified' && slr.row.noise === 'busy',
   'owner agreed: match true, Owner Verified, noise busy');
ok(slr.row.duration_sec === 42 && slr.row.transcript.startsWith('Hi') && slr.row.recording_url === 'https://rec' && slr.row.company === 'Happy Plumbing' && slr.row.attempt_no === 2
   && slr.row.screener_user_id === 'U1' && slr.row.pt_block === 'PT 10-11' && slr.row.event_at === '2026-09-25T17:10:00.000Z', 'call facts from the screener_calls row + contact');
ok(typeof slr.row.ai_confidence === 'number' && slr.row.ai_quote_verified === true && typeof slr.row.attempt_no === 'number', 'numbers are numbers, booleans are booleans');
ok(Object.keys(slr.row).every(k => SQLCOLS.includes(k)), 'every key is a screener_log column');
ok(EVENTS.includes(slr.row.event), 'event is one the table accepts');
slr = lcr({ plan: { action: 'wait', result: '', mark: '', reason: "waiting for the screener's mark" } });
ok(slr.log === true && slr.row.match === null && slr.row.result_stage === null && slr.row.screener_outcome === null && slr.row.noise === null && slr.row.ai_call_outcome === 'owner',
   'AI first, still waiting: row logged, match NULL (never counted as a miss)');
slr = lcr({ plan: { mark: 'Gatekeeper', result: 'Not Sure', mismatch: true, reason: 'screener says gatekeeper, AI says owner' } });
ok(slr.row.match === false && slr.row.result_stage === 'Not Sure' && slr.row.noise === null && slr.row.screener_outcome === 'Gatekeeper', 'mismatch: match false');
slr = lcr({ plan: { mark: 'Wrong Number', result: 'Disqualified', mismatch: false, reason: 'Wrong Number' } });
ok(slr.row.match === null && slr.row.result_stage === 'Disqualified', 'dead-end mark is never compared: match NULL');
slr = lcr({ plan: { mark: '', result: 'Not Sure', mismatch: true, reason: 'nothing marked' } });
ok(slr.row.match === false && slr.row.screener_outcome === null, 'forced, nothing marked: a screener miss (match false)');
ok(lcr({ plan: { action: 'skip', reason: 'contact is not tagged screening' } }).log === false, 'skipped run: nothing logged');
ok(lcr({ plan: { action: 'wait', result: '', verdict_call_id: '', call_id: '' }, verdictIn: null, stored: null }).log === false, 'marked before the call was captured: nothing logged yet');
slr = lcr({ crow: {} });
ok(slr.log === true && !('transcript' in slr.row) && !('duration_sec' in slr.row) && !('recording_url' in slr.row) && slr.row.ai_call_outcome === 'owner' && slr.row.event_at === V1.answered_at,
   'call row not found: facts from the verdict, missing ones omitted (never blanked)');
slr = lcr({ crow: Object.assign({}, CROW, { call_id: 'OTHER', transcript: 'wrong call' }) });
ok(!('transcript' in slr.row), 'a row for another call is never used');
slr = lcr({ verdictIn: null });
ok(slr.row.ai_call_outcome === 'owner' && slr.row.event_key === 'call:CALL1', 'mark path: verdict read from the contact field');

const LAR = codeOf(ctrWf, 'Build Log Row');
const lar = (r, contact) => JSON.parse(JSON.stringify(run(LAR, {}, {
  'Log Row': item(Object.assign({ event_key: 'wavv:W1', contact_id: 'C1', event: 'voicemail', wavv_call_id: 'W1', attempt_no: 2, action: 'apply', result_stage: 'Attempt 3', ok: true, reason: 'dial 2', at_ms: Date.parse('2026-09-25T18:00:00Z') }, r)),
  'GHL: Get Contact': item(contact === undefined ? { contact: { id: 'C1', companyName: 'Happy Plumbing', tags: ['screening'] } } : contact)
})[0].json));
let sla = lar({});
ok(sla.log === true && sla.row.event_key === 'wavv:W1' && sla.row.event === 'voicemail' && sla.row.attempt_no === 2 && sla.row.result_stage === 'Attempt 3'
   && sla.row.event_at === '2026-09-25T18:00:00.000Z' && sla.row.company === 'Happy Plumbing' && !('match' in sla.row) && !('call_id' in sla.row), 'voicemail dial logged with its ladder key, no match');
ok(Object.keys(sla.row).every(k => SQLCOLS.includes(k)) && ['no-answer', 'voicemail', 'bad-number'].every(e => EVENTS.includes(e)), 'dial rows fit the table and its event check');
ok(lar({}, { contact: { id: 'C1', tags: ['plumber'] } }).log === false, 'not a screening lead: not logged');
ok(lar({}, { error: { message: '502' } }).log === false, 'contact unreadable: not logged');
ok(lar({ event: 'bad-number', result_stage: 'Disqualified' }).row.result_stage === 'Disqualified', 'bad number -> Disqualified row');

console.log('=== 13) Screener log: versioning + pending retry (codex review 2026-09-25) ===');
ok(/screener_log_upsert\(r jsonb\)/.test(SQL) && /when excluded\.decided_ms >= t\.decided_ms then excluded\.match else t\.match/.test(SQL)
   && /transcript\s+= coalesce\(excluded\.transcript, t\.transcript\)/.test(SQL) && /revoke execute on function public\.screener_log_upsert\(jsonb\) from public, anon, authenticated/.test(SQL),
   'SQL: decision replaced only by a same-or-later read; facts never blanked; only service_role may call it');
const DEC = codeOf(cmpWf, 'Decide');
ok(/\$\('Stamp Read'\)\.first\(\)\.json\.read_ms/.test(DEC) && /ops: \[\], read_ms/.test(DEC), 'Decide versions its decision with the Stamp Read time, on every outcome');
{ const STR = codeOf(cmpWf, 'Stamp Read');
  const t0 = Date.now(), st = new Function('$json', '$input', '$', STR)({}, { all: () => [{ json: { contact: { id: 'C1' } } }] }, () => null)[0].json;
  ok(st.contact.id === 'C1' && st.read_ms >= t0 && st.read_ms <= Date.now(), 'Stamp Read passes the contact through and stamps the moment the read returned');
  const dSt = run(DEC, {}, { 'When Called by Screener': item({ contact_id: 'C1', verdict_json: '' }), 'GHL: Get Contact': item({ contact: { id: 'C1', tags: [], customFields: [] } }),
    'GHL: Find Screener Opp': item({ opportunities: [] }), 'Stamp Read': item({ read_ms: 4242 }) });
  ok(dSt.read_ms === 4242, 'Decide uses the stamp, not its own later clock (codex: a slow opp search must not make an older snapshot look newer)'); }
slr = lcr({ plan: { read_ms: 1234 } });
ok(slr.row.decided_ms === 1234, 'call row carries the decision version (Decide read_ms)');
ok(typeof lar({}).row.decided_ms === 'number', 'dial row carries a version too');
const QR = codeOf(cmpWf, 'Queue Pending Log');
const qr = new Function('$json', '$input', '$', QR)({}, { first: () => ({ json: { error: { message: '503 Service Unavailable' } } }) },
  n => { if (n === 'Build Log Row') return { first: () => ({ json: { row: { event_key: 'call:C1', decided_ms: 77, match: true } } }) }; throw new Error('no ' + n); })[0].json;
ok(qr.pending_key === 'call:C1@77' && qr.event_key === 'call:C1' && JSON.parse(qr.row_json).match === true && qr.error.includes('503'),
   'failed write: the exact payload is queued, one pending row per version');
const lrWf = wf('Screener Log Retry.json');
ok(JSON.stringify(conn(lrWf, 'Every 15 minutes')) === '[["Get pending log rows"]]' && JSON.stringify(conn(lrWf, 'Supabase: replay screener_log')) === '[["Replayed OK"]]'
   && JSON.stringify(conn(lrWf, 'Replayed OK')) === '[["Delete replayed row"]]', 'Log Retry: pending -> replay -> delete only what succeeded');
ok(!lrWf.nodes.some(n => /leadconnectorhq/.test(JSON.stringify(n.parameters))), 'Log Retry never calls GHL');
ok(/\/rest\/v1\/rpc\/screener_log_upsert$/.test(lrWf.nodes.find(n => n.name === 'Supabase: replay screener_log').parameters.url), 'Log Retry replays through the versioned upsert');
const LRP = codeOf(lrWf, 'Pick replays');
const picks = new Function('$json', '$input', '$', LRP)({}, { all: () => [ { id: 1, pending_key: 'k1', row_json: '{"event_key":"call:C1"}' }, { id: 2, pending_key: 'k2', row_json: 'not json' }, {} ].map(json => ({ json })) }, () => null).map(i => i.json);
ok(picks.length === 1 && picks[0].id === 1 && picks[0].body.r.event_key === 'call:C1', 'unreadable pending rows are left for a human, not replayed');
const LOK = codeOf(lrWf, 'Replayed OK');
const oks = new Function('$json', '$input', '$', LOK)({}, { all: () => [ {}, { error: { message: '500' } } ].map(json => ({ json })) },
  n => ({ all: () => [ { id: 1, pending_key: 'k1' }, { id: 2, pending_key: 'k2' } ].map(json => ({ json })) })).map(i => i.json);
ok(oks.length === 1 && oks[0].id === 1, 'only a successful replay is removed from the queue');

console.log('=== 14) Daily Sweep (item 7b: 14-day expiry, re-screen, daily summary) ===');
const dsWf = wf('Screener Daily Sweep.json');
const SCRP = 'CvDwpavqkHSRhg5Bn3L4', KEVC = '9E6y34DlG1Imr8FV42RV', MANR = 'OOu5TjgalfGZElEIoSbq';
const STG = { a1: '7ff9193f-1e0a-4c93-9626-a6aab22b666b', ov: 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f', gk: 'f83777fa-1dc0-4163-aa84-ef501126d82b',
  ns: '0c160182-e74d-4ace-9d3b-c4404043ef4b', ex: 'c1db8172-84bf-45a1-8f0e-5625157574a5', dq: '65f9e1b4-8688-456d-845e-ebe0781101b9' };
const DSET = { dry_run: false, max_contacts: 50, stale_days: 14, screener_user_id: '', now_ms: Date.parse('2026-09-25T12:00:00Z'), today_pt: '2026-09-25' };
const SD = codeOf(dsWf, 'Decide');
const sweep = ({ tags = ['screening'], date = '', opps = [], dnd = false, settings = {}, contact } = {}) => run(SD, {}, {
  'Settings': item(Object.assign({}, DSET, settings)),
  'One contact': item({ contact_id: 'C1' }),
  'GHL: Get Contact': item(contact !== undefined ? contact : { contact: { id: 'C1', companyName: 'Happy Plumbing', dnd, tags,
    customFields: date ? [ { id: 'MUkHW8R17PIksrSnpz6g', value: date } ] : [] } }),
  'GHL: All Opps for Contact': item({ opportunities: opps })
});
const sopp = (stage, status = 'open', extra = {}) => Object.assign({ id: 'S1', pipelineId: SCRP, pipelineStageId: stage, status, updatedAt: '2026-09-20T00:00:00Z' }, extra);
const kopp = (status = 'open', pipe = KEVC) => ({ id: 'K1', pipelineId: pipe, pipelineStageId: 'x', status });
const d14labels = d => d.ops.map(o => o.label);
let d14sw = sweep({ tags: ['owner-confirmed', 'screened-pt-10-11', 'screen-busy'], date: '2026-09-05', opps: [sopp(STG.ov, 'won'), kopp()] });
ok(d14sw.action === 'expire' && d14sw.ops[0].method === 'DELETE' && JSON.stringify(d14sw.ops[0].body.tags) === '["owner-confirmed","screened-pt-10-11"]'
   && d14sw.ops.some(o => o.url.endsWith('/opportunities/K1/followers') && o.body.followers.length === 10), 'graduated owner, 20 days, Kevin opp open: drops out of the hour lists (tags + block followers off Kevin opp)');
ok(!d14sw.ops.some(o => /screening|Attempt 1/.test(o.label)) && /re-screen trap/.test(d14sw.reason), '... but is NOT re-screened: Kevin still has the lead (re-screen trap)');
ok(sweep({ tags: ['owner-confirmed', 'screened-pt-10-11'], date: '2026-09-15', opps: [sopp(STG.ov, 'won'), kopp()] }).action === 'none', 'owner screened 10 days ago: untouched');
ok(sweep({ tags: ['owner-confirmed'], date: '2026-09-11', opps: [sopp(STG.ov, 'won'), kopp()] }).action === 'none'
   && sweep({ tags: ['owner-confirmed'], date: '2026-09-10', opps: [sopp(STG.ov, 'won'), kopp()] }).action === 'expire', '14 days old: kept; 15 days: expired');
d14sw = sweep({ tags: ['owner-confirmed', 'screened-pt-10-11', 'screen-busy'], date: '2026-09-05', opps: [sopp(STG.ov, 'won'), kopp('lost')] });
ok(d14sw.action === 'expire+rescreen', 'graduated owner whose Kevin opp closed: expired AND re-screened');
const d14clear = d14sw.ops.find(o => o.label === 'clear screener fields');
ok(d14clear && d14clear.body.customFields.length === 5 && d14clear.body.customFields.every(f => f.value === '') && d14labels(d14sw).indexOf('clear screener fields') < d14labels(d14sw).indexOf('screener opp -> Attempt 1 (open)'),
   're-screen clears the five screener fields (mark, verdict, attempts, date, noise) before the stage moves');
ok(JSON.stringify(d14sw.ops.find(o => o.label === 'remove result tags').body.tags) === '["screen-busy"]' && d14sw.ops.some(o => o.label === 'add screening tag')
   && d14sw.ops.find(o => o.label === 'screener opp -> Attempt 1 (open)').body.status === 'open' && d14sw.ops.find(o => o.label === 'screener opp -> Attempt 1 (open)').body.pipelineStageId === STG.a1,
   're-screen: leftover result tags off (hour tags already gone), screening on, won screener opp reopened in Attempt 1');
ok(d14sw.ops.some(o => o.label === 'remove block followers (screener opp)'), 'a reopened screener opp gets its block followers cleared too');
d14sw = sweep({ tags: ['screening', 'screen-mismatch'], date: '2026-09-01', opps: [sopp(STG.gk)] });
ok(d14sw.action === 'rescreen' && !d14sw.ops.some(o => o.label === 'add screening tag') && JSON.stringify(d14sw.ops.find(o => o.label === 'remove result tags').body.tags) === '["screen-mismatch"]', 'Gatekeeper 24 days: re-screened (screening already on)');
ok(sweep({ tags: ['screening'], date: '2026-09-15', opps: [sopp(STG.ns)] }).action === 'none', 'Not Sure 10 days: untouched');
ok(sweep({ tags: ['screening'], date: '2026-09-01', opps: [sopp(STG.ns)] }).action === 'rescreen', 'Not Sure 24 days: re-screened');
ok(sweep({ opps: [sopp(STG.ex, 'open', { lastStageChangeAt: '2026-09-05T00:00:00Z' })] }).action === 'rescreen'
   && sweep({ opps: [sopp(STG.ex, 'open', { lastStageChangeAt: '2026-09-20T00:00:00Z' })] }).action === 'none', 'Exhausted: re-screened after 14 days in the stage, not before');
ok(sweep({ tags: ['screening'], date: '2026-08-01', opps: [sopp(STG.dq)] }).action === 'none', 'Disqualified: never re-screened');
ok(sweep({ tags: ['screening'], date: '2026-08-01', opps: [sopp(STG.a1)] }).action === 'none', 'Attempt stages: never touched');
d14sw = sweep({ tags: ['screening'], date: '2026-09-01', opps: [sopp(STG.gk), kopp('open', MANR)] });
ok(d14sw.action === 'none' && /re-screen trap/.test(d14sw.reason), 'an open Manual Review opp also blocks the re-screen');
ok(/DND/.test(sweep({ tags: ['screening'], date: '2026-09-01', dnd: true, opps: [sopp(STG.gk)] }).reason), 'DND contact: never re-screened');
ok(sweep({ tags: ['screening'], date: '2026-09-01', opps: [sopp(STG.gk)], settings: { screener_user_id: 'TOPU' } }).ops.find(o => o.label === 'clear screener fields').body.assignedTo === 'TOPU'
   && /no screener assigned/.test(sweep({ tags: ['screening'], date: '2026-09-01', opps: [sopp(STG.gk)] }).reason), 're-screen assigns the screener when set, else says so');
ok(sweep({ contact: { error: { message: '502' } } }).action === 'error', 'unreadable contact: error, nothing written');
ok(/without a Date Screened/.test(sweep({ tags: ['owner-confirmed'], opps: [kopp()] }).reason), 'owner-confirmed with no Date Screened: left alone and reported');
d14sw = sweep({ tags: ['owner-confirmed', 'screened-pt-10-11'], date: '2026-09-01', opps: [sopp(STG.ov, 'won'), kopp('lost')] });
ok(d14sw.ops.every(o => /\/contacts\/C1(\/tags)?$/.test(o.url) || /\/opportunities\/(S1|K1)(\/followers)?$/.test(o.url)), 'every request targets this contact or its own opportunities');
d14sw = sweep({ tags: ['owner-confirmed', 'screened-pt-10-11'], date: '2026-09-01', opps: [kopp(), { id: 'D1', pipelineId: 'futfMtQJ6DAxZbRoH9xx', status: 'open' }] });
ok(!d14sw.ops.some(o => o.url.includes('/opportunities/D1')) && d14sw.ops.some(o => o.url.includes('/opportunities/K1/followers')), 'block followers come off screener and Kevin opps only, never an unrelated pipeline (found live: the demo opp)');

const SPL = codeOf(dsWf, 'Plan Sweep');
const planOf = (decs, settings = {}) => new Function('$json', '$input', '$', SPL)({}, { all: () => decs.map(json => ({ json })) },
  n => ({ first: () => ({ json: Object.assign({}, DSET, settings) }) }))[0].json;
const d14dec = (id, n) => ({ contact_id: id, company: id, action: 'rescreen', reason: '', ops: Array.from({ length: n }, (_, i) => ({ label: 'op' + i, method: 'PUT', url: 'u', body: {} })) });
let d14pl = planOf([d14dec('A', 2), d14dec('B', 3), { contact_id: 'C', action: 'none', reason: 'x', ops: [] }], { max_contacts: 1 });
ok(d14pl.planned.length === 1 && d14pl.planned[0].contact_id === 'A' && d14pl.ops.length === 2 && d14pl.ops[0].contact_id === 'A' && JSON.stringify(d14pl.deferred) === '["B"]', 'at most MAX_CONTACTS changed per run; the rest are deferred and reported');
d14pl = planOf([d14dec('A', 2)], { dry_run: true });
ok(d14pl.dry_run === true && d14pl.ops.length === 0 && d14pl.planned.length === 1, 'dry run: planned and reported, nothing sent');

const SCA = codeOf(dsWf, 'Candidates');
const candOf = (contacts, opps) => new Function('$json', '$input', '$', SCA)({}, {}, n => {
  if (n === 'GHL: owner-confirmed contacts') return { first: () => ({ json: contacts }) };
  if (n === 'Stale searches') return { all: () => ['Gatekeeper', 'Not Sure', 'Exhausted', 'graduated'].map(label => ({ json: { label } })) };
  if (n === 'GHL: screener opps') return { all: () => opps.map(json => ({ json })) };
})[0].json;
let d14cd = candOf({ contacts: [ { id: 'A' }, { id: 'B' } ] }, [ { opportunities: [ { contactId: 'B' }, { contactId: 'C' } ] }, { error: { message: '500' } }, { opportunities: [] }, { opportunities: [] } ]);
ok(JSON.stringify(d14cd.contact_ids) === '["A","B","C"]' && JSON.stringify(d14cd.sources.B) === '["owner-confirmed","Gatekeeper"]' && d14cd.search_errors[0].startsWith('Not Sure'), 'candidates: deduped across searches; a failed search is reported');
d14cd = candOf({ contacts: Array.from({ length: 100 }, (_, i) => ({ id: 'X' + i })) }, [ {}, {}, {}, {} ]);
ok(d14cd.truncated.includes('owner-confirmed'), 'a full page (100) is reported as truncated');

const SRP = codeOf(dsWf, 'Sweep Report');
const repOf = (plan, sent, res) => new Function('$json', '$input', '$', SRP)({}, {}, n => {
  const v = { 'Settings': [DSET], 'Candidates': [{ contact_ids: ['A', 'B'], search_errors: [], truncated: [] }], 'Plan Sweep': plan && [plan], 'Split Sweep Ops': sent, 'GHL: Sweep Apply': res }[n];
  if (!v) throw new Error('unexecuted'); return { all: () => v.map(json => ({ json })) };
})[0].json;
let d14rp = repOf({ dry_run: false, planned: [ { contact_id: 'A', action: 'expire' }, { contact_id: 'B', action: 'rescreen' } ], deferred: [], blocked: [], errors: [] },
  [ { contact_id: 'A', label: 'x' }, { contact_id: 'B', label: 'y' } ], [ {}, { error: { message: '500' } } ]);
ok(d14rp.expired.length === 1 && d14rp.rescreened.length === 0 && d14rp.failed.length === 1 && d14rp.failed[0].startsWith('B y: 500'), 'report: a contact with a failed request is listed as failed, not done');
ok(repOf(null, null, null).candidates === 2 && repOf(null, null, null).expired.length === 0, 'report works when no contact needed anything');
ok(new Function('$json', '$input', '$', SRP)({}, {}, n => { if (n === 'Settings') return { all: () => [{ json: Object.assign({}, DSET, { dry_run: true }) }] }; throw new Error('unexecuted'); })[0].json.dry_run === true, 'a dry run with no candidates still says dry run (read from Settings)');

const SSB = codeOf(dsWf, 'Build Summary');
const sumOf = ({ rep = {}, counts = [], d24 = { calls: 3, compared: 2, matched: 1, owners: 1, no_answers: 5, voicemails: 1, bad_numbers: 0 }, wb = [], grads = [], pend = [] } = {}) => {
  const stages = ['Attempt 1', 'Attempt 2', 'Attempt 3', 'Attempt 4', 'Owner Verified', 'Gatekeeper', 'Not Sure', 'Exhausted', 'Disqualified'];
  const m = { 'Sweep Report': [Object.assign({ expired: [], rescreened: [], blocked: [], deferred: [], failed: [], errors: [], search_errors: [], truncated: [] }, rep)],
    'Stage count searches': stages.map(name => ({ name })), 'GHL: stage counts': stages.map((_, i) => ({ meta: { total: counts[i] != null ? counts[i] : 3 } })),
    'Supabase: last 24h': [d24], 'Failed write-backs': wb, 'Failed graduations': grads, 'Pending log writes': pend };
  return new Function('$json', '$input', '$', SSB)({}, {}, n => ({ all: () => (m[n] || []).map(json => ({ json })) }))[0].json;
};
let d14sm = sumOf();
ok(/Attempt 1 3/.test(d14sm.text) && /3 answered calls/.test(d14sm.text) && /match 1\/2 \(50%\)/.test(d14sm.text) && /nothing :white_check_mark:/.test(d14sm.text) && d14sm.needs_human === false, 'summary: stage counts, last 24 h with match rate, all d14clear');
ok(/Attempt 1 is empty/.test(sumOf({ counts: [0] }).text), 'empty Attempt 1 -> "load the next set" (spec: a signal, not a failure)');
const d14old = new Date(Date.now() - 3 * 86400000).toISOString(), d14fresh = new Date().toISOString();
d14sm = sumOf({ wb: [ { id: 1, contact_id: 'C9', contact_name: 'Old Plumbing', received_at: d14old }, { id: 2, contact_id: 'C8', received_at: d14fresh } ], grads: [ { id: 3, contact_id: 'C7', reason: 'x', at: d14old } ], pend: [ { id: 4 } ] });
ok(d14sm.needs_human && /1 GHL write-backs failing for 48 h\+: Old Plumbing/.test(d14sm.text) && /1 graduations failing/.test(d14sm.text) && /1 Supabase log writes pending/.test(d14sm.text),
   'needs a human: write-backs failing 48 h+ (not d14fresh ones), stuck graduations, pending log writes');
ok(/dry run/.test(sumOf({ rep: { dry_run: true } }).text) && /Supabase not readable/.test(sumOf({ d24: { error: { message: '401' } } }).text), 'dry runs and an unreadable Supabase are said out loud');
ok(/not re-screened/.test(sumOf({ rep: { blocked: [ {} ] } }).text) && /deferred/.test(sumOf({ rep: { deferred: ['X'] } }).text), 'blocked and deferred leads are counted');

{ // half-failed sweeps (codex review): saved, replayed, or dropped when the lead moved since
  const planP = (decs, pend) => new Function('$json', '$input', '$', SPL)({}, { all: () => decs.map(json => ({ json })) },
    n => n === 'Settings' ? { first: () => ({ json: DSET }) } : { all: () => (pend || []).map(json => ({ json })) })[0].json;
  const P = { contact_id: 'P1', ops_json: JSON.stringify([{ label: 'screener opp -> Attempt 1 (open)', method: 'PUT', url: 'u', body: {} }]), error: 'x: 500', queued_at: '2026-09-24T12:00:00.000Z', first_failed_at: '2026-09-24T12:00:00.000Z' };
  let pp = planP([{ contact_id: 'P1', company: 'P', action: 'none', reason: '', ops: [], scr_stage_changed_at: '2026-09-20T00:00:00.000Z' }], [P]);
  ok(pp.planned.length === 1 && pp.planned[0].action === 'retry' && pp.ops.length === 1 && pp.ops[0].contact_id === 'P1', 'half-failed re-screen (Date Screened already cleared, so nothing new is planned): the saved writes are replayed');
  pp = planP([{ contact_id: 'P1', company: 'P', action: 'none', reason: '', ops: [], scr_stage_changed_at: '2026-09-24T18:00:00.000Z' }], [P]);
  ok(pp.planned.length === 0 && pp.superseded.length === 1, 'the lead moved after the failure (a newer call/dial): not replayed, reported');
  pp = planP([{ contact_id: 'P1', company: 'P', action: 'rescreen', reason: '', ops: [{ label: 'fresh', method: 'PUT', url: 'u', body: {} }] }], [P]);
  ok(pp.ops.length === 1 && pp.ops[0].label === 'fresh', 'if the lead still needs work, the fresh plan wins over the saved writes');
  // codex review: a replay must pass the same re-screen guards as a fresh decision
  const NODATE = { contact_id: 'P1', company: 'P', action: 'none', reason: '', ops: [], scr_stage_changed_at: '2026-09-20T00:00:00.000Z' };
  pp = planP([Object.assign({}, NODATE, { dnd: true })], [P]);
  ok(pp.ops.length === 0 && pp.stopped.length === 1 && /DND/.test(pp.stopped[0].why) && pp.blocked.length === 1, 'contact now DND: the saved re-screen is NOT replayed; counted as blocked and stopped for a human');
  pp = planP([Object.assign({}, NODATE, { open_kevin: true })], [P]);
  ok(pp.ops.length === 0 && pp.stopped.length === 1 && /re-screen trap/.test(pp.stopped[0].why) && /not re-screened/.test(pp.blocked[0].reason), 'lead now has an open Kevin opp: no screening tag, no Attempt 1 (re-screen trap), reason kept');
  const PEXP = Object.assign({}, P, { ops_json: JSON.stringify([{ label: 'remove hour-block tags', method: 'DELETE', url: 'u', body: {} }, { label: 'remove block followers (Kevin opp)', method: 'DELETE', url: 'k', body: {} }]) });
  pp = planP([Object.assign({}, NODATE, { open_kevin: true })], [PEXP]);
  ok(pp.ops.length === 2 && pp.stopped.length === 0, 'expire-only saved writes are still replayed with an open Kevin opp (expiry applies either way)');
  const DSD = sweep({ tags: ['screening'], opps: [sopp(STG.gk), kopp('open', MANR)], dnd: true });
  ok(DSD.open_kevin === true && DSD.dnd === true, 'Decide reports the current guards for every contact');
  const CDP = codeOf(dsWf, 'Candidates');
  const cdp = new Function('$json', '$input', '$', CDP)({}, {}, n => {
    if (n === 'GHL: owner-confirmed contacts') return { first: () => ({ json: { contacts: [] } }) };
    if (n === 'Stale searches' || n === 'GHL: screener opps') return { all: () => [] };
    if (n === 'Pending sweeps') return { all: () => [{ json: { contact_id: 'P1' } }] };
  })[0].json;
  ok(JSON.stringify(cdp.contact_ids) === '["P1"]', 'a pending contact is always re-read, whatever stage it is in now');
  const repP = (plan, sent, res, pend, settings = {}) => new Function('$json', '$input', '$', SRP)({}, {}, n => {
    const v = { 'Settings': [Object.assign({}, DSET, settings)], 'Candidates': [{ contact_ids: ['A', 'P1'] }], 'Plan Sweep': [plan], 'Split Sweep Ops': sent, 'GHL: Sweep Apply': res, 'Pending sweeps': pend }[n];
    if (!v) throw new Error('unexecuted'); return { all: () => v.map(json => ({ json })) };
  })[0].json;
  const PL = { planned: [ { contact_id: 'A', action: 'rescreen' }, { contact_id: 'P1', action: 'retry' } ], deferred: [], blocked: [], errors: [], superseded: [] };
  const SENT = [ { contact_id: 'A', label: 'clear screener fields', method: 'PUT', url: 'ua', body: {} }, { contact_id: 'A', label: 'screener opp -> Attempt 1 (open)', method: 'PUT', url: 'ub', body: {} }, { contact_id: 'P1', label: 'screener opp -> Attempt 1 (open)', method: 'PUT', url: 'uc', body: {} } ];
  let rpp = repP(PL, SENT, [ {}, { error: { message: '500' } }, {} ], [P]);
  ok(rpp.pending_save.length === 1 && rpp.pending_save[0].contact_id === 'A' && JSON.parse(rpp.pending_save[0].ops_json).length === 2 && /Attempt 1/.test(rpp.pending_save[0].error),
     'codex case: fields cleared but the stage move failed -> the contact is saved with ALL its writes for the next run');
  ok(JSON.stringify(rpp.pending_clear) === '["P1"]' && rpp.retried.length === 1, 'a replayed contact that now succeeded leaves the pending table');
  rpp = repP(PL, SENT, [ {}, { error: { message: '500' } }, { error: { message: '503' } } ], [P]);
  ok(rpp.pending_save.find(p => p.contact_id === 'P1').first_failed_at === P.first_failed_at && !rpp.pending_clear.includes('P1'), 'failing again keeps the first failure time');
  const rstop = repP(Object.assign({}, PL, { planned: [], stopped: [ { contact_id: 'P1', company: 'P', why: 'contact is DND' } ] }), [], [], [P]);
  ok(rstop.pending_clear.includes('P1') && rstop.stopped.length === 1, 'a stopped replay leaves the pending table (reported once, not looped daily)');
  ok(repP(PL, [], [], [P], { dry_run: true }).pending_save.length === 0 && repP(PL, [], [], [P], { dry_run: true }).pending_clear.length === 0, 'a dry run never touches the pending table');
  const PCH = codeOf(dsWf, 'Pending sweep changes');
  const ch = new Function('$json', '$input', '$', PCH)({}, { first: () => ({ json: { pending_save: [{ contact_id: 'A' }], pending_clear: ['P1'] } }) }, () => null).map(i => i.json);
  ok(ch.length === 2 && ch[0].op === 'save' && ch[1].op === 'clear' && ch[1].contact_id === 'P1', 'pending changes: one save item, one clear item');
  const sm2 = sumOf({ rep: { pending_save: [{ contact_id: 'A', error: 'x: 500' }], superseded: [{ company: 'Moved Co' }], retried: [{}] } });
  ok(/1 half-done re-screens stopped/.test(sumOf({ rep: { stopped: [ { company: 'Now DND Co', why: 'contact is DND' } ] } }).text), 'summary lists stopped re-screens under Needs a human');
  ok(sm2.needs_human && /half changed by the sweep/.test(sm2.text) && /Moved Co/.test(sm2.text) && /1 earlier half-done sweeps finished/.test(sm2.text), 'summary: half-done sweeps, superseded leads, and finished retries are reported');
  const old2 = new Date(Date.now() - 3 * 86400000).toISOString(), recent2 = new Date().toISOString();
  ok(/1 graduations failing/.test(sumOf({ grads: [ { id: 1, contact_id: 'G1', reason: 'x', at: recent2, first_failed_at: old2 } ] }).text), 'a graduation failing for 3 days is flagged even though its last retry was just now (codex)');
}
ok(JSON.stringify(conn(dsWf, 'Any candidates?')) === '[["One contact"],["Sweep Report"]]' && JSON.stringify(conn(dsWf, 'Write to GHL?')) === '[["Split Sweep Ops"],["Sweep Report"]]'
   && JSON.stringify(conn(dsWf, 'Sweep Report')) === '[["Pending sweep changes","Stage count searches"]]' && JSON.stringify(conn(dsWf, 'Build Summary')) === '[["Slack: daily summary"]]'
   && JSON.stringify(conn(dsWf, 'Save or clear?')) === '[["Save pending sweep"],["Clear pending sweep"]]' && JSON.stringify(conn(dsWf, 'GHL: screener opps')) === '[["Pending sweeps"]]',
   'wiring: no candidates / dry run both still reach the report and the Slack summary');
ok(['Supabase: last 24h', 'Failed write-backs', 'Failed graduations', 'Pending log writes'].every(n => dsWf.nodes.find(x => x.name === n).executeOnce === true), 'the summary reads run once, not once per stage');
ok(/create or replace view public\.screener_last_24h/.test(SQL), 'SQL: screener_last_24h view defined');

console.log(`\n===== RESULT: ${PASS} passed, ${FAIL} failed =====`);
process.exit(FAIL ? 1 : 0);
