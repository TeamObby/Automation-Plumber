const fs=require('fs'); const { callCompare, recordOutcome } = require('./call_compare.js'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const TABLE = `{ __rl: true, mode: 'id', value: '3WK4mrEYwvDeDUVO', cachedResultName: 'screener_calls' }`;
const COLS = [['ai_ok','boolean'],['writeback_ok','boolean'],['writeback_result','string'],['writeback_fail_ms','number'],['call_id','string'],['contact_id','string'],['contact_name','string'],['ghl_user_id','string'],['wavv_caller_id','string'],['answered_at','string'],['pt_block','string'],['pt_block_tag','string'],['duration_sec','number'],['recording_url','string'],['transcript','string'],['transcript_source','string'],['ai_call_outcome','string'],['ai_owner_reached','string'],['ai_confidence','number'],['ai_evidence_quote','string'],['ai_quote_verified','boolean'],['ai_owner_name','string'],['ai_model','string'],['ai_error','string'],['received_at','string']];
const schema = JSON.stringify(COLS.map(([id,type])=>({id,displayName:id,required:false,defaultMatch:false,display:true,type,readOnly:false,removed:false})));
const bool = (name, field) => `{ leftValue: expr('{{ $json.${field} }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }`;
const cond = list => `{ options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [ ${list} ], combinator: 'and' }`;
const code=`import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const hook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Webhook (Screener Call Recorded)', position: [0, 300], parameters: { httpMethod: 'POST', path: 'screener-call', options: {} } },
  output: [{ body: { contact_id: 'C1', customData: { call_id: '01a0c4d5', ghl_user_id: 'U1', wavv_caller_id: '8055727879', contact_name: 'Ramirez Plumbing', call_duration_seconds: '42', call_recording_url: 'https://file.wavv.com/recordings/x/call.mp3', call_transcript: 'Ramirez Plumbing. I own the shop.', call_answered_at_timestamp: '2026-09-21T16:38:45.357Z' } } }]
});

const normalize = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Normalize Call', position: [224, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('normalize_call.js')} } },
  output: [{ call_id: '01a0c4d5', contact_id: 'C1', contact_name: 'Ramirez Plumbing', ghl_user_id: 'U1', wavv_caller_id: '8055727879', answered_at: '2026-09-21T16:38:45.357Z', duration_sec: 42, recording_url: 'https://file.wavv.com/recordings/x/call.mp3', transcript: 'Ramirez Plumbing. I own the shop.', transcript_source: 'wavv', pt_block: 'PT 09-10', pt_block_tag: 'screened-pt-09-10', is_pickup: true, needs_transcription: false, received_at: '2026-09-21T16:40:30.000Z' }]
});

const answered = node({
  type: 'n8n-nodes-base.filter', version: 2.2,
  config: { name: 'Filter: answered call with id', position: [448, 300], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.call_id }}'), rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } }, ${bool('p','is_pickup')}`)}, options: {} } },
  output: [{ call_id: '01a0c4d5', is_pickup: true }]
});

const findRow = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Find Row: screener_calls by call_id', position: [672, 300], alwaysOutputData: true, parameters: { resource: 'row', operation: 'get', dataTableId: ${TABLE}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'call_id', condition: 'eq', keyValue: expr('{{ $json.call_id }}') } ] }, returnAll: false, limit: 1 } },
  output: [{ id: 4, call_id: '01a0c4d5', ai_ok: true, writeback_ok: false }]
});

const route = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Route Replay', position: [896, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('route_replay.js')} } },
  output: [{ call_id: '01a0c4d5', route: 'classify', needs_transcription: false }]
});

const notDone = node({
  type: 'n8n-nodes-base.filter', version: 2.2,
  config: { name: 'Filter: not already written back', position: [1120, 300], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.route }}'), rightValue: 'done', operator: { type: 'string', operation: 'notEquals' } }`)}, options: {} } },
  output: [{ call_id: '01a0c4d5', route: 'classify' }]
});

const reuse = ifElse({
  version: 2.2,
  config: { name: 'IF: verdict already stored?', position: [1344, 300], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.route }}'), rightValue: 'writeback', operator: { type: 'string', operation: 'equals' } }`)} } }
});

const needsTx = ifElse({
  version: 2.2,
  config: { name: 'IF: transcript missing?', position: [1568, 300], parameters: { conditions: ${cond(bool('t','needs_transcription'))} } }
});

const download = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'Download Recording (MP3)', position: [1792, 160], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("{{ $('Normalize Call').first().json.recording_url }}"), options: { response: { response: { responseFormat: 'file' } } } } },
  output: [{}]
});

const whisper = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'Transcribe (OpenAI Whisper)', position: [2016, 160], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: 'https://api.openai.com/v1/audio/transcriptions', authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi',
      sendBody: true, contentType: 'multipart-form-data',
      bodyParameters: { parameters: [ { parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'data' }, { name: 'model', value: 'whisper-1' } ] }, options: {} },
    credentials: { openAiApi: { id: 'B4xA6dDfoOhHJMOo', name: 'OpenAI account' } } },
  output: [{ text: 'Ramirez Plumbing. I own the shop.' }]
});

const fromAudio = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Set Transcript (from audio)', position: [2240, 160], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('set_transcript_audio.js')} } },
  output: [{ call_id: '01a0c4d5', transcript: 'Ramirez Plumbing. I own the shop.', transcript_source: 'whisper' }]
});

const ready = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Transcript Ready', position: [2464, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('transcript_ready.js')} } },
  output: [{ call_id: '01a0c4d5', contact_name: 'Ramirez Plumbing', transcript: 'Ramirez Plumbing. I own the shop.', transcript_source: 'wavv' }]
});

const classify = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: { name: 'Screener: Classify Transcript', position: [2688, 300], parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: 'LbGY5ptzldJjnTZJ', cachedResultName: 'Screener: Classify Transcript' },
    workflowInputs: { mappingMode: 'defineBelow',
      value: { transcript: expr('{{ $json.transcript }}'), contact_name: expr('{{ $json.contact_name }}') },
      matchingColumns: [],
      schema: [
        { id: 'transcript', displayName: 'transcript', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
        { id: 'contact_name', displayName: 'contact_name', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' }
      ],
      attemptToConvertTypes: false, convertFieldsToString: true },
    mode: 'each', options: { waitForSubWorkflow: true } } },
  output: [{ call_outcome: 'owner', owner_reached: 'yes', confidence: 0.9, evidence_quote: 'I own the shop', quote_verified: true, owner_name: '', model: 'gpt-4o-mini', truncated: false, ai_error: '' }]
});

const buildRow = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Build Row', position: [2912, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('build_row.js')} } },
  output: [{ call_id: '01a0c4d5', ai_call_outcome: 'owner' }]
});

const store = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Store: screener_calls (upsert on call_id)', position: [3136, 300], retryOnFail: true, parameters: { resource: 'row', operation: 'upsert', dataTableId: ${TABLE}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'call_id', condition: 'eq', keyValue: expr('{{ $json.call_id }}') } ] },
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: ${schema}, attemptToConvertTypes: false, convertFieldsToString: false },
    options: {} } },
  output: [{ id: 1, call_id: '01a0c4d5' }]
});

const verdictOut = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Verdict For Contact', position: [3360, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('verdict_for_contact.js')} } },
  output: [{ contact_id: 'C1', verdict_json: '{"call_id":"01a0c4d5","call_outcome":"owner"}' }]
});

${callCompare({ pos: [3584, 300], verdict: "expr('{{ $json.verdict_json }}')", source: 'call' })}

${recordOutcome({ v: 'rec', pos: [3808, 300], callId: "$('Verdict For Contact').first().json.call_id" })}

const note = sticky('## Screener: Capture Call  (spec §9 event 1 · §10.2 items 1–4)\\nGHL Call Recorded (screener calls only, once Hridoy wires the trigger) → normalize + Pacific hour block → dedupe on call_id (done = stop; verdict stored but GHL write-back failed = retry the compare with the stored verdict, no AI) → Whisper only if WAVV sent no transcript → AI verdict → row in screener_calls → Screener: Compare Step (Screen AI Verdict on the contact; stage/tags/follower once the screener has marked) → writeback_ok on the row.\\nKeep INACTIVE until the four GHL guard branches exist.', [normalize, route, classify, store, compare], { color: 5 });

export default workflow('screener-capture-call', 'Screener: Capture Call')
  .add(hook).to(normalize).to(answered).to(findRow).to(route).to(notDone)
  .to(reuse.onTrue(verdictOut).onFalse(needsTx))
  .add(needsTx.onTrue(download.to(whisper).to(fromAudio).to(ready)).onFalse(ready))
  .add(ready).to(classify).to(buildRow).to(store).to(verdictOut)
  .add(verdictOut).to(compare).to(recIf.onTrue(recOk).onFalse(recFail))
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/capture.sdk.js',code);
