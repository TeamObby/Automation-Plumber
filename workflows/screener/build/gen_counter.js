const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const { callCompare } = require('./call_compare.js');
const { logNodes, logChain } = require('./log_supabase.js');
const ATT = `{ __rl: true, mode: 'id', value: '9V6VL0XiKeadY9Lc', cachedResultName: 'screener_attempts' }`;
const GHL_AUTH = `authentication: 'predefinedCredentialType', nodeCredentialType: 'httpMultipleHeadersAuth'`;
const GHL_CRED = `credentials: { httpMultipleHeadersAuth: { id: 'DtotRKnzjDewbSsv', name: 'GHL [ Waterline Growth subaccount ] Multiple Headers Auth account' } }`;
const COLS = [['event_key','string'],['contact_id','string'],['event','string'],['wavv_call_id','string'],['attempt_no','number'],['result_stage','string'],['action','string'],['ok','boolean'],['reason','string'],['at_ms','number'],['received_at','string']];
const schema = JSON.stringify(COLS.map(([id,type])=>({id,displayName:id,required:false,defaultMatch:false,display:true,type,readOnly:false,removed:false})));
const bool = f => `{ leftValue: expr('{{ ${f} }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }`;
const cond = list => `{ options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [ ${list} ], combinator: 'and' }`;
const code=`import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1,
  config: { name: 'When Called (attempt event)', position: [224, 300],
    parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [ { name: 'contact_id', type: 'string' }, { name: 'event', type: 'string' }, { name: 'wavv_call_id', type: 'string' }, { name: 'event_key', type: 'string' }, { name: 'at_ms', type: 'number' }, { name: 'received_at', type: 'string' } ] } } },
  output: [{ contact_id: 'C1', event: 'no-answer', wavv_call_id: '', event_key: 'na:C1:1', at_ms: 1, received_at: '2026-09-24T00:00:00.000Z' }]
});

const event = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Event', position: [448, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('attempt_event.js')} } },
  output: [{ contact_id: 'C1', event: 'no-answer', event_key: 'na:C1:1', at_ms: 1 }]
});

const recent = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Recent attempts for contact', position: [672, 300], alwaysOutputData: true, parameters: { resource: 'row', operation: 'get', dataTableId: ${ATT}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'contact_id', condition: 'eq', keyValue: expr('{{ $json.contact_id }}') } ] },
    returnAll: false, limit: 20, orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'DESC' } },
  output: [{ event_key: 'na:C1:0', contact_id: 'C1', event: 'no-answer', at_ms: 0, ok: true }]
});

const dedupe = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Attempt Dedupe', position: [896, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('attempt_dedupe.js')} } },
  output: [{ contact_id: 'C1', event: 'no-answer', event_key: 'na:C1:1', at_ms: 1, route: 'count', stored_attempt_no: null }]
});

const notDup = node({
  type: 'n8n-nodes-base.filter', version: 2.2,
  config: { name: 'Filter: not a duplicate', position: [1120, 300], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.route }}'), rightValue: 'duplicate', operator: { type: 'string', operation: 'notEquals' } }`)}, options: {} } },
  output: [{ contact_id: 'C1', route: 'count' }]
});

const getContact = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Get Contact', position: [1344, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("https://services.leadconnectorhq.com/contacts/{{ $('Attempt Dedupe').first().json.contact_id }}"), ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{ contact: { id: 'C1', tags: ['screening'], customFields: [] } }]
});

const findOpp = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Find Screener Opp', position: [1568, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&pipeline_id=CvDwpavqkHSRhg5Bn3L4&contact_id={{ $('Attempt Dedupe').first().json.contact_id }}&limit=20"), ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{ opportunities: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: '7ff9193f-1e0a-4c93-9626-a6aab22b666b', status: 'open' } ] }]
});

const ladder = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Ladder', position: [1792, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('ladder.js')} } },
  output: [{ contact_id: 'C1', action: 'apply', attempt_no: 1, result_stage: 'Attempt 2', force_compare: false, retry: false, ops: [ { label: 'x', method: 'PUT', url: 'https://services.leadconnectorhq.com/contacts/C1', body: {} } ] }]
});

const skip = ifElse({
  version: 2.2,
  config: { name: 'Skip?', position: [2016, 300], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.action }}'), rightValue: 'skip', operator: { type: 'string', operation: 'equals' } }`)} } }
});

const split = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Split Ladder Ops', position: [2240, 400], parameters: { mode: 'runOnceForAllItems', jsCode: "return $('Ladder').first().json.ops.map(o => ({ json: o }));\\n" } },
  output: [{ label: 'x', method: 'PUT', url: 'https://services.leadconnectorhq.com/contacts/C1', body: {} }]
});

const apply = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Ladder Apply', position: [2464, 400], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: expr('{{ $json.method }}'), url: expr('{{ $json.url }}'), ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'),
      options: { batching: { batch: { batchSize: 1, batchInterval: 250 } } } }, ${GHL_CRED} },
  output: [{ succeeded: true }]
});

const report = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Ladder Report', position: [2688, 400], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('ladder_report.js')} } },
  output: [{ failed: [], requests: 2 }]
});

const forceIf = ifElse({
  version: 2.2,
  config: { name: 'Unmarked answered call?', position: [2912, 400], parameters: { conditions: ${cond(bool('$json.force_compare'))} } }
});

${callCompare({ pos: [3136, 496], verdict: "''", source: 'ladder', force: true }).replace("value: { contact_id: expr('{{ $json.contact_id }}')", "value: { contact_id: expr(\"{{ $('Ladder').first().json.contact_id }}\")")}

const logRow = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Log Row', position: [3360, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('attempt_log_row.js')} } },
  output: [{ event_key: 'na:C1:1', contact_id: 'C1', event: 'no-answer', attempt_no: 1, action: 'apply', result_stage: 'Attempt 2', ok: true }]
});

const store = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Store: screener_attempts (upsert on event_key)', position: [3584, 300], retryOnFail: true, parameters: { resource: 'row', operation: 'upsert', dataTableId: ${ATT}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'event_key', condition: 'eq', keyValue: expr('{{ $json.event_key }}') } ] },
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: ${schema}, attemptToConvertTypes: false, convertFieldsToString: false },
    options: {} } },
  output: [{ id: 1, event_key: 'na:C1:1' }]
});

${logNodes({ builder: 'log_attempt_row.js', x: 3808, y: 300, returnFrom: 'Store: screener_attempts (upsert on event_key)' })}

const note = sticky('## Screener: Attempt Counter  (spec §9 events 3 + 4 · §10.2 item 5)\\nSub-workflow, called by Screener: No Answer and Screener: WAVV Disposition. No-answer dials and the WAVV auto-dispositions Voicemail / Bad Number walk a screening lead up the ladder: dial n -> Attempt n+1, 4th -> Exhausted, Bad Number -> Disqualified. Screen Attempts is SET, not incremented; every event is a row in screener_attempts (dedupe on the WAVV call id, or a 30 s window for no-answer). A dial after an answered call nobody marked forces the Compare Step (Not Sure + mismatch). Each event is also a screener_log row in Supabase (item 7a).\\nKeep INACTIVE until the four GHL guard branches exist.', [ladder, dedupe, store], { color: 5 });

export default workflow('screener-attempt-counter', 'Screener: Attempt Counter')
  .add(whenCalled).to(event).to(recent).to(dedupe).to(notDup).to(getContact).to(findOpp).to(ladder)
  .to(skip.onTrue(logRow).onFalse(split.to(apply).to(report).to(forceIf.onTrue(compare.to(logRow)).onFalse(logRow))))
  .add(logRow).to(store).to(${logChain})
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/counter.sdk.js',code);
