const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const { logNodes, logChain } = require('./log_supabase.js');
const { TABLE } = require('./call_compare.js');
const GHL_AUTH = `authentication: 'predefinedCredentialType', nodeCredentialType: 'httpMultipleHeadersAuth'`;
const GHL_CRED = `credentials: { httpMultipleHeadersAuth: { id: 'DtotRKnzjDewbSsv', name: 'GHL [ Waterline Growth subaccount ] Multiple Headers Auth account' } }`;
const code=`import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1,
  config: { name: 'When Called by Screener', position: [0, 300],
    parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [ { name: 'contact_id', type: 'string' }, { name: 'verdict_json', type: 'string' }, { name: 'source', type: 'string' }, { name: 'force', type: 'boolean' } ] } } },
  output: [{ contact_id: 'C1', verdict_json: '', source: 'mark', force: false }]
});

const guardRead = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Guard Read', position: [224, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("https://services.leadconnectorhq.com/contacts/{{ $('When Called by Screener').first().json.contact_id }}"), ${GHL_AUTH}, options: {} },
    ${GHL_CRED} },
  output: [{ contact: { id: 'C1', tags: ['screening'], customFields: [] } }]
});

// Persist-then-read (codex review): the new verdict is on the contact BEFORE the read Decide uses.
const planSave = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Plan Save', position: [448, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('plan_save.js')} } },
  output: [{ save: true, older: false }]
});

const saveFirst = ifElse({
  version: 2.2,
  config: { name: 'Save verdict first?', position: [672, 300], parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.save }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ],
    combinator: 'and' } } }
});

const saveVerdict = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Save Verdict', position: [896, 208], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'PUT', url: expr("https://services.leadconnectorhq.com/contacts/{{ $('When Called by Screener').first().json.contact_id }}"), ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ customFields: [ { id: 'boOwqb5qGOmbWBopWvTv', value: $('When Called by Screener').first().json.verdict_json } ] }) }}"), options: {} },
    ${GHL_CRED} },
  output: [{ succeeded: true }]
});

const getContact = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Get Contact', position: [1120, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("https://services.leadconnectorhq.com/contacts/{{ $('When Called by Screener').first().json.contact_id }}"), ${GHL_AUTH}, options: {} },
    ${GHL_CRED} },
  output: [{ contact: { id: 'C1', tags: ['screening'], customFields: [] } }]
});

const stampRead = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Stamp Read', position: [1232, 420], parameters: { mode: 'runOnceForAllItems', jsCode: ${JSON.stringify("// The version of this run's contact snapshot for the screener log: the time the contact read returned.\nconst read_ms = Date.now();\nreturn $input.all().map(i => ({ json: Object.assign({}, i.json, { read_ms }) }));\n")} } },
  output: [{ read_ms: 1 }]
});

const findOpp = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Find Screener Opp', position: [1344, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&pipeline_id=CvDwpavqkHSRhg5Bn3L4&contact_id={{ $('When Called by Screener').first().json.contact_id }}&limit=20"), ${GHL_AUTH}, options: {} },
    ${GHL_CRED} },
  output: [{ opportunities: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: '7ff9193f-1e0a-4c93-9626-a6aab22b666b', status: 'open', followers: [] } ] }]
});

const decide = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Decide', position: [1568, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('decide.js')} } },
  output: [{ contact_id: 'C1', source: 'mark', action: 'apply', reason: 'screener and AI agree: owner', result: 'Owner Verified', stage_id: 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f', mismatch: false, notes: [], ops: [ { label: 'add tags', method: 'POST', url: 'https://services.leadconnectorhq.com/contacts/C1/tags', body: { tags: ['owner-confirmed'] } } ] }]
});

const hasOps = ifElse({
  version: 2.2,
  config: { name: 'Anything to write?', position: [1792, 300], parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.ops.length > 0 }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ],
    combinator: 'and' } } }
});

const split = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Split Ops', position: [2016, 208], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('split_ops.js')} } },
  output: [{ n: 1, contact_id: 'C1', label: 'add tags', method: 'POST', url: 'https://services.leadconnectorhq.com/contacts/C1/tags', body: { tags: ['owner-confirmed'] } }]
});

const apply = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Apply', position: [2240, 208], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: expr('{{ $json.method }}'), url: expr('{{ $json.url }}'), ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'),
      options: { batching: { batch: { batchSize: 1, batchInterval: 250 } } } },
    ${GHL_CRED} },
  output: [{ succeeded: true }]
});

const report = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Report', position: [2464, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('report.js')} } },
  output: [{ contact_id: 'C1', call_id: '01a0c4d5', action: 'apply', result: 'Owner Verified', reason: '', mismatch: false, notes: [], requests: 1, failed: [], ok: true }]
});

const findCall = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Find call row', position: [2688, 300], alwaysOutputData: true, parameters: { resource: 'row', operation: 'get', dataTableId: ${TABLE}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'call_id', condition: 'eq', keyValue: expr("{{ $('Decide').first().json.verdict_call_id || $('Decide').first().json.call_id || '-' }}") } ] }, returnAll: false, limit: 1 } },
  output: [{ id: 4, call_id: '01a0c4d5', duration_sec: 42, recording_url: 'https://x', transcript: 'Hello' }]
});

${logNodes({ builder: 'log_call_row.js', x: 2912, y: 300, returnFrom: 'Report' })}

const note = sticky('## Screener: Compare Step  (spec §4.1 · §10.2 item 4)\\nShared by Capture Call (AI verdict arrived) and Mark + Compare (screener picked). Saves a new verdict FIRST, then reads the contact, pairs Screener Outcome with Screen AI Verdict, and writes stage, tags, block follower, Date Screened, Screen Noise.\\nGuard: does nothing unless the contact is tagged screening. Waits (writes only the verdict/noise) until both marks exist, unless force=true. ok=false (a failed request, or a retryable state) leaves writeback_ok=false for Screener: Write-back Retry. All logic is in Decide; the rest only executes its ops. Then one screener_log row in Supabase (item 7a, upsert on event_key); Return hands back the Report output unchanged.', [getContact, decide, apply], { color: 5 });

export default workflow('screener-compare-step', 'Screener: Compare Step')
  .add(whenCalled).to(guardRead).to(planSave)
  .to(saveFirst.onTrue(saveVerdict.to(getContact)).onFalse(getContact))
  .add(getContact).to(stampRead).to(findOpp).to(decide)
  .to(hasOps.onTrue(split.to(apply).to(report)).onFalse(report))
  .add(report).to(findCall).to(${logChain})
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/compare.sdk.js',code);
