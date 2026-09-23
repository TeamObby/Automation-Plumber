/**
 * Static verification for the screener workflows (spec docs/screener-system-plan.md §10.2 items 1–3).
 * -----------------------------------------------------------------------------------------------
 * Runs the actual code nodes out of the workflow JSON snapshots:
 *   - Pacific hour block (item 3): both DST transitions, both block edges, the tag spelling contract
 *   - Normalize Call against the real GHL "Call Recorded" payload shape (from production exec 121333)
 *   - Prep Transcript: strict JSON schema, temperature 0, truncation, too-short transcripts
 *   - Parse Verdict: every guard (API error, bad enums, inconsistent fields, hallucinated quote)
 *   - Build Row: every field it emits is a screener_calls column (the upsert auto-maps by name)
 *   - The eval harness embeds exactly tests/fixtures/screener-transcripts.json
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
ok(JSON.stringify(store.parameters.columns.schema.map(c => c.id).sort()) === JSON.stringify(COLUMNS.slice().sort()), 'upsert schema == data table columns');
ok(store.parameters.filters.conditions[0].keyName === 'call_id', 'upsert keyed on call_id');
const dedupe = capture.nodes.find(x => x.name === 'Dedupe: no successful row for call_id');
ok(dedupe.parameters.operation === 'rowNotExists' && dedupe.parameters.filters.conditions[0].keyName === 'call_id', 'dedupe on call_id before the AI call');
// Only a SUCCESSFUL row blocks a replay; a row stored after an AI/transcription failure must be retryable (codex review #2).
const dc = dedupe.parameters.filters.conditions;
ok(dedupe.parameters.matchType === 'allConditions' && dc.some(c => c.keyName === 'ai_ok' && c.condition === 'eq' && c.keyValue === '={{ true }}'),
   'dedupe matches only rows with ai_ok = true');
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

console.log(`\n===== RESULT: ${PASS} passed, ${FAIL} failed =====`);
process.exit(FAIL ? 1 : 0);
