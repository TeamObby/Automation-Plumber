/**
 * Static verification for the metrics-logging edits (call_log / email_log Sheets nodes).
 * -----------------------------------------------------------------------------------
 * Runs the actual `Parse + Map Outcome` / `Build Logs` / `Build Logs + Route` code nodes
 * out of the workflow JSON, reconstructs the EXACT row each Google Sheets node would write
 * (resolving every mapping expression against the code-node output), and asserts the
 * metrics-sheet-setup.gs data contract on the result.
 *
 * Covers: expression↔output cross-check, all 15 dispositions, human vs ai_fallback,
 * every call stage in both pipelines, email steps 1-4 + missed-call-email, and three
 * fixtures taken from real production executions (53417 / 52703 / 54156) with personal
 * identifiers scrubbed — the STRUCTURE (which GHL fields are present/omitted, {contact}
 * vs {contacts} nesting, the Instantly-429 error shape) is preserved verbatim.
 *
 * Run:  node tests/metrics-logging.test.js
 *       (optional, for full-fidelity date tokens: `npm i luxon` — falls back to a
 *        fixed-clock shim otherwise, which is enough for the structural assertions.)
 */
const fs = require('fs');
const path = require('path');

let DateTime;
try { DateTime = require('luxon').DateTime; console.log('[luxon: real]'); }
catch {
  const F = { isValid: true, toFormat: (f) =>
    f.includes('HH:mm:ss') ? '2026-07-24 12:00:00' : f === 'yyyy-LL-dd' ? '2026-07-24'
    : f.includes('ccc') ? 'Fri, Jul 24, 2026, 12:00 PM' : '2026-07-24' };
  DateTime = { now: () => ({ setZone: () => F }),
               fromISO: () => ({ setZone: () => ({ ...F, isValid: false }) }) };
  console.log('[luxon: shim — `npm i luxon` for full-fidelity date tokens]');
}

const ROOT = path.join(__dirname, '..');
const wf = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const codeOf = (d, n) => d.nodes.find(x => x.name === n).parameters.jsCode;
const sheetNode = d => d.nodes.find(n => n.type === 'n8n-nodes-base.googleSheets');
const runCode = (code, mock) => new Function('DateTime', '$', code)(DateTime, name => {
  if (!(name in mock)) throw new Error('mock missing node: ' + name);
  return mock[name];
}).json;

let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) PASS++; else { FAIL++; console.log('  ✗ FAIL:', m); } };

// Reconstruct the row the Sheets node writes: expression -> code output, literal -> as-is.
function effectiveRow(sheet, out) {
  const row = {};
  for (const [col, val] of Object.entries(sheet.parameters.columns.value)) {
    if (typeof val === 'string' && val.startsWith('=')) {
      const m = val.match(/\$\('([^']+)'\)\.item\.json\.(\w+)/);
      ok(!!m, `expr parses for column ${col}: ${val}`);
      if (m) { ok(m[2] in out, `code node returns field '${m[2]}' for column '${col}'`); row[col] = out[m[2]]; }
    } else row[col] = val;
  }
  return row;
}

const CALL_HEADERS = ['timestamp_pt','date_pt','contact_id','company','city','from_number','pipeline','stage_name','attempt_no','is_mgr','is_missed_variant','picked_up','duration_sec','disposition_source','disposition_slug','ai_outcome','final_outcome','resume_call_at','recording_url','call_id','call_transcript'];
// Missed-call handlers map every call_log column EXCEPT call_transcript — they never see a
// transcript (no pickup, nothing to transcribe), so they leave that cell untouched.
const MISSED_CALL_HEADERS = CALL_HEADERS.filter(h => h !== 'call_transcript');
const EMAIL_HEADERS = ['timestamp_pt','date_pt','contact_id','company','city','campaign_id','step','event_type','reply_classification','instantly_lead_id','email_id'];
const KNOWN = ['cold-good','cold-bad','cold-on-hold','gatekeeper-good','gatekeeper-bad','gatekeeper-on-hold','conversation-active','conversation-active-on-hold','appointment-booked','sales-call','not-interested-right-now-good','not-interested-right-now-bad','do-not-contact','voicemail','call-center'];

const assertHeaders = (sheet, headers, label) =>
  ok(JSON.stringify(Object.keys(sheet.parameters.columns.value).sort()) === JSON.stringify([...headers].sort()),
     `${label}: value-map columns == sheet headers`);

function assertCallContract(row, label, opts = {}) {
  ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.timestamp_pt), `${label}: timestamp_pt shape`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(row.date_pt), `${label}: date_pt is a real date string`);
  ok(['TRUE','FALSE'].includes(row.picked_up), `${label}: picked_up boolean-literal`);
  ok(['TRUE','FALSE'].includes(row.is_mgr), `${label}: is_mgr boolean-literal`);
  ok(['TRUE','FALSE'].includes(row.is_missed_variant), `${label}: is_missed_variant boolean-literal`);
  ok(row.attempt_no === '' || [1,2,3].includes(row.attempt_no), `${label}: attempt_no in {1,2,3,''} (${row.attempt_no})`);
  ok(row.final_outcome === '' || KNOWN.includes(row.final_outcome), `${label}: final_outcome known-or-empty (${row.final_outcome})`);
  ok(['human','ai_fallback',''].includes(row.disposition_source), `${label}: disposition_source enum (${row.disposition_source})`);
  ok(row.duration_sec === '' || /^\d+$/.test(String(row.duration_sec)), `${label}: duration_sec bare number-as-text (${row.duration_sec})`);
  if ('call_transcript' in row) {
    // USER_ENTERED would read a leading = + @ - as a formula; a cell caps at 50k chars.
    ok(!/^[=+@-]/.test(String(row.call_transcript)), `${label}: call_transcript cannot trigger a formula`);
    ok(String(row.call_transcript).length <= 45020, `${label}: call_transcript within the cell cap`);
  }
  Object.entries(row).forEach(([k,v]) => ok(v !== undefined && v !== null, `${label}: ${k} not undefined/null`));
  if (opts.needCallId) ok(String(row.call_id||'') !== '', `${label}: call_id non-empty (dedup key)`);
}

// ---- mock builders (synthetic) ----
const cfArr = over => {
  const base = { 'u9UymBEMP3f7IZqDTwVd':'', 'ixRO9dSUHVd6vNTdFa7Q':'False',
    'HW0eBfoQPW2mwxX8aY7Q': JSON.stringify({stage_id:'4b1d7a88-87c0-422b-90e4-b48d16430900'}),
    '7D9N71mEDfipN90zfV0j':'', 'ZVeEoK85i5EOhWt1HO1F':'', 'AH3JqyYEPzPX4wXKoX1V':'', 'TWLomDBX0XInU1IKrG8L':'lead-1' };
  Object.assign(base, over || {});
  return Object.entries(base).map(([id,value]) => ({id,value}));
};
function dispMock(disp, {fallback=false, mgr=false, stage='Day 2 Call', N=2, ai='cold-good', resume='',
                        transcript='x', duration='47', recording='https://rec.example/c1.mp3'}={}) {
  const contact = { id:'C1', city:'Austin', firstName:'Bob', customFields: cfArr(mgr ? {'u9UymBEMP3f7IZqDTwVd':'note'} : {}) };
  const b = { contact_id:'C1', is_fallback:fallback, disposition:fallback?'':disp, note:'', transcript:transcript,
    opp_id:'OPP1', route:'cold', caller_N:N, call_id:'wavv-'+disp+'-'+N, stage_name:stage,
    call_duration:duration, call_recording_url:recording,
    company_name:'Acme Plumbing', signature:disp+'|', last_event_log_entry:'', last_call_summary_entry:'', dispo_matched:true };
  return { 'Build Prompt':{item:{json:b}}, 'Call Input':{item:{json:{contact}}},
           'OpenAI: Classify Call':{item:{json:{choices:[{message:{content:JSON.stringify({summary:'s',outcome:ai,resume_call_at:resume})}}]}}} };
}

console.log('=== 1) Disposition handlers: cross-check + contract ===');
for (const p of ['workflows/call-disposition/Cold Handler.json','workflows/call-disposition/Gatekeeper Handler.json']) {
  const d = wf(p), sheet = sheetNode(d), lbl = p.split('/').pop();
  assertHeaders(sheet, CALL_HEADERS, lbl);
  ok(sheet.parameters.operation === 'appendOrUpdate', `${lbl}: op appendOrUpdate`);
  ok(JSON.stringify(sheet.parameters.columns.matchingColumns) === '["call_id"]', `${lbl}: match on call_id`);
  assertCallContract(effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock('cold-good'))), lbl, {needCallId:true});
}

console.log('=== 2) Disposition: full 15-outcome sweep + fallback + N=0 edge ===');
{
  const d = wf('workflows/call-disposition/Cold Handler.json'), sheet = sheetNode(d);
  for (const disp of KNOWN) {
    const row = effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock(disp,{ai:disp})));
    ok(row.final_outcome === disp, `sweep ${disp}: final_outcome==disposition`);
    assertCallContract(row, `sweep:${disp}`, {needCallId:true});
  }
  const fr = effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock('', {fallback:true, ai:'appointment-booked'})));
  ok(fr.disposition_source === 'ai_fallback', 'fallback: source ai_fallback');
  ok(fr.disposition_slug === '', 'fallback: disposition_slug empty');
  ok(fr.final_outcome === 'appointment-booked', 'fallback: final_outcome from AI');
  ok(effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock('cold-good',{N:0}))).attempt_no === '', 'edge N=0 -> attempt_no empty');

  // duration / recording / transcript: threaded in from Call Router Context + Call Input
  const tr = effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock('cold-good')));
  ok(tr.duration_sec === '47', 'threaded: duration_sec lands in the row');
  ok(tr.recording_url === 'https://rec.example/c1.mp3', 'threaded: recording_url lands in the row');
  ok(tr.call_transcript === 'x', 'threaded: call_transcript lands in the row');

  // sheet-safety of the transcript cell (USER_ENTERED + the 50k cell cap)
  for (const lead of ['=SUM(A1)', '+1 caller', '-- inaudible --', '@here']) {
    const r = effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock('cold-good',{transcript:lead})));
    ok(r.call_transcript === "'" + lead, `sheet-safe: leading '${lead[0]}' quoted as text`);
  }
  const lng = effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock('cold-good',{transcript:'y'.repeat(60000)})));
  ok(lng.call_transcript.length === 45015, `sheet-safe: 60k transcript truncated to 45015 (got ${lng.call_transcript.length})`);

  // a call captured before this change (or an anomaly) has no ctx values -> empty cells, never undefined
  const bare = effectiveRow(sheet, runCode(codeOf(d,'Parse + Map Outcome'), dispMock('cold-good',{duration:'',recording:'',transcript:''})));
  ok(bare.duration_sec === '' && bare.recording_url === '' && bare.call_transcript === '',
     'missing capture data -> empty strings, not undefined');
}

console.log('=== 2b) Capture -> Dispatcher -> Handler: duration/recording/transcript round-trip ===');
{
  // runCode with a $json input item (Capture/Dispatcher code nodes read $json, the handlers don't).
  const runCode$ = (code, mock, json) => new Function('DateTime','$','$json', code)(DateTime, name => {
    if (!(name in mock)) throw new Error('mock missing node: ' + name);
    return mock[name];
  }, json).json;

  const cap = wf('workflows/call-disposition/Capture Call Record.json');
  const DUR = '183', REC = 'https://recordings.example/abc.mp3', TXT = 'Hi, this is Kevin calling.';
  const DAY2 = '4b1d7a88-87c0-422b-90e4-b48d16430900';   // cold pipeline, Day 2 Call

  // 1. Normalize Call -> Transcript Ready: the two fields survive the hop that used to drop them.
  const norm = { contact_id:'C1', email:'b@acme.test', company_name:'Acme Plumbing', call_id:'wavv-9',
                 duration:DUR, call_recording_url:REC, transcript:TXT };
  const tready = runCode$(codeOf(cap,'Transcript Ready'), {'Normalize Call':{item:{json:norm}}}, {transcript:TXT});
  ok(tready.call_duration === DUR, 'Transcript Ready carries call_duration');
  ok(tready.call_recording_url === REC, 'Transcript Ready carries call_recording_url');

  // 2. Determine Caller Context -> both land inside the stored Call Router Context JSON.
  const opps = { opportunities: [{ id:'OPP1', pipelineId:'9E6y34DlG1Imr8FV42RV', pipelineStageId:DAY2 }] };
  const dcc = runCode$(codeOf(cap,'Determine Caller Context'), {'Transcript Ready':{item:{json:tready}}}, opps);
  ok(dcc.anomaly === '' && dcc.route === 'cold', 'Determine Caller Context: clean cold match');
  const ctx = JSON.parse(dcc.context_json);
  ok(ctx.call_duration === DUR, 'Call Router Context carries call_duration');
  ok(ctx.call_recording_url === REC, 'Call Router Context carries call_recording_url');
  ok(ctx.stage_id === DAY2 && ctx.opp_id === 'OPP1', 'Call Router Context keeps its existing keys');

  // 3. Dispatcher Prep + Gate reads that ctx back off the contact and puts both on the contract.
  const disp = wf('workflows/call-disposition/Dispatcher.json');
  const contact = { id:'C1', city:'Austin', firstName:'Bob', companyName:'Acme Plumbing', customFields: cfArr({
    'HW0eBfoQPW2mwxX8aY7Q': dcc.context_json, 'BD9TmgEynOEy6bCvZshm': dcc.state_json,
    'YxGIrvPl5tfLeYoc7Ldr': 'Cold Good', '2j4uCLLeAbtj8sDTS84o': TXT }) };
  const gate = runCode$(codeOf(disp,'Prep + Gate'),
    {'Normalize':{item:{json:{contact_id:'C1', call_id:'wavv-9', is_fallback:false}}}}, { contact });
  ok(gate.proceed === true, 'Prep + Gate proceeds on a real disposition');
  ok(gate.call_duration === DUR, 'handler contract carries call_duration');
  ok(gate.call_recording_url === REC, 'handler contract carries call_recording_url');
  ok(gate.transcript === TXT, 'handler contract carries transcript');

  // 3b. ANOMALY: Capture clears ctx + state, so a disposition on an unattributable call
  //     cannot ride the PREVIOUS call's context into a handler and move the wrong opp.
  const CTX_F = 'HW0eBfoQPW2mwxX8aY7Q', STATE_F = 'BD9TmgEynOEy6bCvZshm';
  const clearNode = cap.nodes.find(n => n.name === 'GHL: Clear Context (anomaly)');
  ok(!!clearNode, 'Capture has a GHL: Clear Context (anomaly) node');
  ok(cap.connections['IF: anomaly?'].main[0][0].node === 'GHL: Clear Context (anomaly)',
     'anomaly (true) branch hits the clear before the stub');
  const cleared = (clearNode.parameters.jsonBody.match(/id: '(\w+)', value: ''/g) || []).join('|');
  ok(cleared.includes(CTX_F) && cleared.includes(STATE_F),
     'clear node blanks BOTH Call Router Context and Call Processing State');

  // the two anomaly shapes really do fail the gate that guards Store Context
  for (const [label, oppList] of [['none', []],
       ['multiple', [{id:'O1',pipelineId:'9E6y34DlG1Imr8FV42RV',pipelineStageId:DAY2},
                     {id:'O2',pipelineId:'3onA8GkJnSwgzIGTGSpI',pipelineStageId:'042d9b81-1cb4-4265-a3c0-086b7d9d149d'}]]]) {
    const a = runCode$(codeOf(cap,'Determine Caller Context'),
      {'Transcript Ready':{item:{json:tready}}}, {opportunities:oppList});
    ok(a.anomaly === label, `anomaly '${label}' detected -> Store Context skipped`);
  }

  // and a cleared contact neutralises the Dispatcher: no route, no opp, nothing to move
  const wiped = { id:'C1', city:'Austin', customFields: cfArr({ [CTX_F]:'', [STATE_F]:'',
    'YxGIrvPl5tfLeYoc7Ldr':'Cold Good', '2j4uCLLeAbtj8sDTS84o':TXT }) };
  const blocked = runCode$(codeOf(disp,'Prep + Gate'),
    {'Normalize':{item:{json:{contact_id:'C1', call_id:'wavv-anom', is_fallback:false}}}}, { contact: wiped });
  ok(blocked.route === 'none', 'cleared ctx -> route none (Switch falls to the no-op branch)');
  ok(blocked.opp_id === '', 'cleared ctx -> no opp_id, so no handler could move anything');
  ok(blocked.caller_N === 0 && blocked.stage_name === '', 'cleared ctx -> no stale caller stage');

  // 4. …through both handlers, all the way into the call_log row.
  for (const p of ['workflows/call-disposition/Cold Handler.json','workflows/call-disposition/Gatekeeper Handler.json']) {
    const h = wf(p), lbl = p.split('/').pop();
    const bp = runCode(codeOf(h,'Build Prompt'), {'Call Input':{item:{json:gate}}});
    const row = effectiveRow(sheetNode(h), runCode(codeOf(h,'Parse + Map Outcome'), {
      'Build Prompt':{item:{json:bp}}, 'Call Input':{item:{json:gate}},
      'OpenAI: Classify Call':{item:{json:{choices:[{message:{content:JSON.stringify({summary:'s',outcome:'cold-good',resume_call_at:''})}}]}}} }));
    ok(row.duration_sec === DUR, `${lbl}: end-to-end duration_sec`);
    ok(row.recording_url === REC, `${lbl}: end-to-end recording_url`);
    ok(row.call_transcript === TXT, `${lbl}: end-to-end call_transcript`);
    assertCallContract(row, `e2e:${lbl}`, {needCallId:true});
  }
}

console.log('=== 3) Missed-call handlers: cross-check + contract (each pipeline\'s own stages) ===');
function stageNameMap(code) {
  const body = code.match(/const STAGE_NAME = \{([\s\S]*?)\};/)[1];
  const out = {};
  for (const m of body.matchAll(/'([0-9a-f-]{36})':\s*'([^']+)'/g)) out[m[1]] = m[2];
  return out;
}
for (const p of ['workflows/missed-call/Cold Handler.json','workflows/missed-call/Gatekeeper Handler.json']) {
  const d = wf(p), sheet = sheetNode(d), lbl = p.split('/').pop();
  const wantPipe = p.includes('missed-call/Gatekeeper') ? 'gatekeeper' : 'cold';
  assertHeaders(sheet, MISSED_CALL_HEADERS, lbl);
  ok(sheet.parameters.operation === 'append', `${lbl}: op append`);
  for (const [sid,sname] of Object.entries(stageNameMap(codeOf(d,'Build Logs')))) {
    if (!/Day \d/.test(sname)) continue;
    const gc = { id:'C7', city:'Dallas', companyName:'Bexar Plumbing', firstName:'Sue',
      customFields:[{id:'ixRO9dSUHVd6vNTdFa7Q',value:'False'},{id:'7D9N71mEDfipN90zfV0j',value:''},{id:'TWLomDBX0XInU1IKrG8L',value:'lead-7'}] };
    const mock = { 'GHL: Get Contact':{item:{json:{contacts:[gc]}}},
      'Normalize':{item:{json:{contact_id:'C7',opp_id:'OPPX',stage_id:sid,instantly_lead_id:'lead-7'}}} };
    const row = effectiveRow(sheet, runCode(codeOf(d,'Build Logs'), mock));
    ok(row.picked_up === 'FALSE', `${lbl} ${sname}: picked_up FALSE`);
    ok(row.pipeline === wantPipe, `${sname}: pipeline ${wantPipe}`);
    ok(row.attempt_no === Number((sname.match(/Day (\d)/)||[])[1]), `${sname}: attempt_no`);
    ok(row.is_missed_variant === (sname.includes('(missed call)')?'TRUE':'FALSE'), `${sname}: is_missed_variant`);
    assertCallContract(row, `${lbl}:${sname}`);
  }
}

console.log('=== 4) Email Sent: cross-check + contract (steps 1..4 + missed-call-email) ===');
{
  const d = wf('workflows/email-sent/Email Sent -_ Move To Sent Stage.json'), sheet = sheetNode(d);
  assertHeaders(sheet, EMAIL_HEADERS, 'email-sent');
  ok(sheet.parameters.operation === 'append', 'email: op append');
  for (const [step, expect] of [['cold email 1',1],['cold email 2',2],['cold email 3',3],['cold email 4',4],['missed call email 1','']]) {
    const sc = { id:'C5', city:'Houston', companyName:'Lone Star', opportunities:[{id:'EOPP',pipelineId:'1A1RkYaL93s2rqbQ3Opi'}],
      customFields:[{id:'WtFfl1nEbMupk2oR4m9e',value:step},{id:'4Ysr9E6CKC2vZK9m6MNm',value:''},{id:'7D9N71mEDfipN90zfV0j',value:''},{id:'TcdjZt3fwFSZTgY6ngeE',value:''},{id:'ZVeEoK85i5EOhWt1HO1F',value:''}] };
    const mock = { 'GHL: Search Contact by Email':{item:{json:{contacts:[sc]}}},
      'Instantly: Get Email':{item:{json:{items:[{id:'EM-1',body:{html:'<p>hi</p>'},timestamp_email:''}]}}},
      'Normalize':{item:{json:{campaign_id:'CAMP',instantly_lead_id:'lead-5'}}} };
    const row = effectiveRow(sheet, runCode(codeOf(d,'Build Logs + Route'), mock));
    ok(row.event_type === 'sent', `email ${step}: event_type sent`);
    ok(row.step === expect, `email ${step}: step==${JSON.stringify(expect)}`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(row.date_pt), `email ${step}: date_pt real date`);
    Object.entries(row).forEach(([k,v]) => ok(v !== undefined && v !== null, `email ${step}: ${k} not undefined`));
  }
}

console.log('=== 5) REAL fixtures (from prod executions, identifiers scrubbed) ===');
// 5a. Disposition — exec 53417: gatekeeper-good in the COLD pipeline (empty CFs omitted by GHL).
{
  const cf = [
    {id:'TWLomDBX0XInU1IKrG8L',value:'inst-lead-aaa'},
    {id:'HW0eBfoQPW2mwxX8aY7Q',value:'{"opp_id":"OPP-A","route":"cold","caller_N":1,"call_id":"call-uuid-aaa","stage_name":"Day 1 Call A","stage_id":"060f44a8-4cd8-4561-8c84-7150bfd57498"}'},
    {id:'YxGIrvPl5tfLeYoc7Ldr',value:'Gatekeeper Good'},{id:'7D9N71mEDfipN90zfV0j',value:'prev'},{id:'ZVeEoK85i5EOhWt1HO1F',value:'prev'}
    /* NOTE: u9UymBEMP3f7IZqDTwVd (Missed Call Review) + ixRO9dSUHVd6vNTdFa7Q (Stop Emails) intentionally ABSENT — GHL omits empty fields */
  ];
  const contact = { id:'CONTACT-A', city:'Orange', companyName:'Example Plumbing Co', firstName:'Owner', email:'owner@example.com', customFields:cf };
  const ci = { route:'cold', is_fallback:false, contact_id:'CONTACT-A', disposition:'Gatekeeper Good', note:'', transcript:'...',
    signature:'gatekeeper-good|', opp_id:'OPP-A', caller_N:1, call_id:'call-uuid-aaa', stage_name:'Day 1 Call A',
    last_event_log_entry:'', last_call_summary_entry:'', last_signature:'gatekeeper-bad|', company_name:'Example Plumbing Co', contact };
  const mock = { 'Call Input':{item:{json:ci}}, 'Build Prompt':{item:{json:Object.assign({},ci,{disposition:'gatekeeper-good',dispo_matched:true})}},
    'OpenAI: Classify Call':{item:{json:{choices:[{message:{content:'{"summary":"gatekeeper answered","outcome":"gatekeeper-good","resume_call_at":""}'}}]}}} };
  const d = wf('workflows/call-disposition/Cold Handler.json');
  const out = runCode(codeOf(d,'Parse + Map Outcome'), mock);
  const row = effectiveRow(sheetNode(d), out);
  ok(out.target_stage_id === 'e4b13f51-2229-4d47-aa3e-12381a31a8c1', '5a: target stage = Cold Email 2 (matches prod)');
  ok(row.pipeline === 'cold' && row.final_outcome === 'gatekeeper-good', '5a: pipeline=cold + final=gatekeeper-good');
  ok(row.is_mgr === 'FALSE', '5a: is_mgr FALSE (field omitted by GHL)');
  ok(row.call_id === 'call-uuid-aaa' && row.attempt_no === 1, '5a: call_id + attempt_no');
  assertCallContract(row, '5a-real-disposition', {needCallId:true});
}
// 5b. Missed-call — exec 52703: redial Day 1 Call A (N:0 -> attempt_no 1), {contact} nesting.
{
  const mock = { 'GHL: Get Contact':{item:{json:{contact:{ id:'CONTACT-B', city:'Hilo', companyName:'Example Plumbing Inc',
      tags:['plumber','last_call_missed'], customFields:[{id:'ixRO9dSUHVd6vNTdFa7Q',value:'True'}] }}}},
    'Normalize':{item:{json:{contact_id:'CONTACT-B', instantly_lead_id:'', email:'', opp_id:'OPP-B',
      pipeline_id:'9E6y34DlG1Imr8FV42RV', stage_id:'060f44a8-4cd8-4561-8c84-7150bfd57498', outcome:'no answer'}}} };
  const d = wf('workflows/missed-call/Cold Handler.json');
  const row = effectiveRow(sheetNode(d), runCode(codeOf(d,'Build Logs'), mock));
  ok(row.stage_name === 'Day 1 Call A' && row.attempt_no === 1, '5b: Day 1 Call A -> attempt_no 1 (not N=0)');
  ok(row.pipeline === 'cold' && row.picked_up === 'FALSE', '5b: pipeline cold, picked_up FALSE');
  ok(row.is_mgr === 'FALSE', '5b: is_mgr FALSE');
  assertCallContract(row, '5b-real-missed');
}
// 5c. Email — exec 54156: cold email 1, Instantly Get Email returned HTTP 429.
{
  const mock = { 'GHL: Search Contact by Email':{item:{json:{contacts:[{ id:'CONTACT-C', city:'Paramount', companyName:'Example Repipe Specialist',
      opportunities:[{pipelineId:'1A1RkYaL93s2rqbQ3Opi', id:'OPP-C', pipelineStageId:'f9bcbefb-aa83-44d4-ad8b-59a758993045', status:'open'}],
      customFields:[{id:'WtFfl1nEbMupk2oR4m9e',value:'cold email 1'},{id:'4Ysr9E6CKC2vZK9m6MNm',value:''},{id:'7D9N71mEDfipN90zfV0j',value:''},{id:'TcdjZt3fwFSZTgY6ngeE',value:''},{id:'ZVeEoK85i5EOhWt1HO1F',value:''}] }],total:1}}},
    'Instantly: Get Email':{item:{json:{error:{message:'429',name:'AxiosError',status:429}}}},  // real 429 shape
    'Normalize':{item:{json:{lead_email:'scrubbed@example.com', campaign_id:'995a75d0-4325-4b19-aefe-e69c9a4a86d2', campaign_name:'Cold & Missed Call Emails', instantly_lead_id:'inst-lead-ccc'}}} };
  const d = wf('workflows/email-sent/Email Sent -_ Move To Sent Stage.json');
  const row = effectiveRow(sheetNode(d), runCode(codeOf(d,'Build Logs + Route'), mock));
  ok(row.step === 1 && row.event_type === 'sent', '5c: step 1, event_type sent');
  ok(row.email_id === '', '5c: email_id blank on Instantly 429 (send still logs)');
  ok(row.campaign_id === '995a75d0-4325-4b19-aefe-e69c9a4a86d2', '5c: campaign_id');
  Object.entries(row).forEach(([k,v]) => ok(v !== undefined && v !== null, `5c: ${k} not undefined`));
}

console.log(`\n===== RESULT: ${PASS} passed, ${FAIL} failed =====`);
process.exit(FAIL ? 1 : 0);
