// Screener: Graduate (sub-workflow, one lead) and Screener: Graduate Sweep (schedule) — spec §8, item 6.
const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const IDS = require('./ids.json');
const GHL_AUTH = `authentication: 'predefinedCredentialType', nodeCredentialType: 'httpMultipleHeadersAuth'`;
const GHL_CRED = `credentials: { httpMultipleHeadersAuth: { id: 'DtotRKnzjDewbSsv', name: 'GHL [ Waterline Growth subaccount ] Multiple Headers Auth account' } }`;
const GRAD = `{ __rl: true, mode: 'id', value: '1iX0aTvMYawwyH4H', cachedResultName: 'screener_graduations' }`;
const COLS = [['grad_key','string'],['contact_id','string'],['screener_opp_id','string'],['kevin_opp_id','string'],['kevin_pipeline','string'],['created_new','boolean'],['pt_block','string'],['action','string'],['ok','boolean'],['reason','string'],['at','string']];
const schema = JSON.stringify(COLS.map(([id,type])=>({id,displayName:id,required:false,defaultMatch:false,display:true,type,readOnly:false,removed:false})));
const cond = list => `{ options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [ ${list} ], combinator: 'and' }`;

fs.writeFileSync(__dirname+'/out/graduate.sdk.js', `import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1,
  config: { name: 'When Called (graduate)', position: [0, 300],
    parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [ { name: 'contact_id', type: 'string' }, { name: 'screener_opp_id', type: 'string' } ] } } },
  output: [{ contact_id: 'C1', screener_opp_id: 'O1' }]
});

const getContact = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Get Contact', position: [224, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("https://services.leadconnectorhq.com/contacts/{{ $('When Called (graduate)').first().json.contact_id }}"), ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{ contact: { id: 'C1', tags: ['screening', 'owner-confirmed', 'screened-pt-10-11'], email: '', companyName: 'Happy Plumbing' } }]
});

const allOpps = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: All Opps for Contact', position: [448, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: expr("https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&contact_id={{ $('When Called (graduate)').first().json.contact_id }}&limit=100"), ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{ opportunities: [ { id: 'O1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f', status: 'open' } ] }]
});

const plan = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Graduation Plan', position: [672, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('graduate_decide.js')} } },
  output: [{ contact_id: 'C1', screener_opp_id: 'O1', action: 'graduate', create: { pipelineId: '9E6y34DlG1Imr8FV42RV' }, kevin_opp_id: '', block_user: 'T4p1bK3yo6Bl14OK1LP3', remove_tags: ['screening'] }]
});

const isGrad = ifElse({ version: 2.2, config: { name: 'Graduate?', position: [896, 300], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.action }}'), rightValue: 'graduate', operator: { type: 'string', operation: 'equals' } }`)} } } });

const needCreate = ifElse({ version: 2.2, config: { name: 'New Kevin opp needed?', position: [1120, 208], parameters: { conditions: ${cond(`{ leftValue: expr('{{ !!$json.create }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }`)} } } });

const create = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Create Kevin Opp', position: [1344, 120], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: 'https://services.leadconnectorhq.com/opportunities/', ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr("{{ JSON.stringify($('Graduation Plan').first().json.create) }}"), options: {} }, ${GHL_CRED} },
  output: [{ opportunity: { id: 'K1' } }]
});

const ops = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Graduation Ops', position: [1568, 208], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('graduate_ops.js')} } },
  output: [{ label: 'clear screener as owner', method: 'PUT', url: 'https://services.leadconnectorhq.com/contacts/C1', body: { assignedTo: null }, kevin_opp_id: 'K1' }]
});

const haveKevin = ifElse({ version: 2.2, config: { name: 'Kevin opp exists?', position: [1792, 208], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.method }}'), rightValue: 'SKIP', operator: { type: 'string', operation: 'notEquals' } }`)} } } });

const apply = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Graduation Apply', position: [2016, 120], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: expr('{{ $json.method }}'), url: expr('{{ $json.url }}'), ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'),
      options: { batching: { batch: { batchSize: 1, batchInterval: 250 } } } }, ${GHL_CRED} },
  output: [{ succeeded: true }]
});

const gate = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Close Gate', position: [2240, 120], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('graduate_gate.js')} } },
  output: [{ close: true, failed: [], url: 'https://services.leadconnectorhq.com/opportunities/O1', body: { status: 'won' } }]
});

const allOk = ifElse({ version: 2.2, config: { name: 'All writes OK?', position: [2464, 120], parameters: { conditions: ${cond(`{ leftValue: expr('{{ $json.close }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }`)} } } });

const closeOpp = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Close Screener Opp', position: [2688, 40], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'PUT', url: expr('{{ $json.url }}'), ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'), options: {} }, ${GHL_CRED} },
  output: [{ succeeded: true }]
});

const logRow = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Log Graduation', position: [2912, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('graduate_log.js')} } },
  output: [{ grad_key: 'C1:O1', contact_id: 'C1', ok: true }]
});

const store = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Store: screener_graduations', position: [3136, 300], retryOnFail: true, parameters: { resource: 'row', operation: 'upsert', dataTableId: ${GRAD}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'grad_key', condition: 'eq', keyValue: expr('{{ $json.grad_key }}') } ] },
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: ${schema}, attemptToConvertTypes: false, convertFieldsToString: false }, options: {} } },
  output: [{ id: 1, grad_key: 'C1:O1' }]
});

const note = sticky('## Screener: Graduate  (spec §8 · §10.2 item 6)\\nOne Owner Verified lead into Kevin\\u2019s machine: create his opportunity by the Import Contact To New rule (email -> Client Acquisition / New, else Cold Call / Day 1 Call A) or reuse an open one, copy the PT block follower, remove screening + wavv tags, clear the screener as owner. Close Gate closes the screener opportunity only if every one of those writes succeeded; any failure leaves it in Owner Verified for the next sweep. Called only by Screener: Graduate Sweep.', [plan, create, apply, gate, closeOpp], { color: 5 });

export default workflow('screener-graduate', 'Screener: Graduate')
  .add(whenCalled).to(getContact).to(allOpps).to(plan)
  .to(isGrad.onTrue(needCreate.onTrue(create.to(ops)).onFalse(ops)).onFalse(logRow))
  .add(ops).to(haveKevin.onTrue(apply.to(gate).to(allOk.onTrue(closeOpp.to(logRow)).onFalse(logRow))).onFalse(logRow))
  .add(logRow).to(store)
  .add(note);
`);

fs.writeFileSync(__dirname+'/out/gradsweep.sdk.js', `import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const every = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.2,
  config: { name: 'Every 10 minutes', position: [0, 300], parameters: { rule: { interval: [ { field: 'minutes', minutesInterval: 10 } ] } } },
  output: [{}]
});

const find = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Owner Verified screener opps', position: [224, 300], retryOnFail: true,
    parameters: { url: 'https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&pipeline_id=CvDwpavqkHSRhg5Bn3L4&pipeline_stage_id=c8e33d9d-fd1b-46f6-87a6-7cc47841642f&status=open&limit=50', ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{ opportunities: [ { id: 'O1', contactId: 'C1', pipelineId: 'CvDwpavqkHSRhg5Bn3L4', pipelineStageId: 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f', status: 'open', lastStageChangeAt: '2026-09-24T00:00:00.000Z' } ] }]
});

const pick = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Pick ready leads (10 min grace)', position: [448, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('graduate_pick.js')} } },
  output: [{ contact_id: 'C1', screener_opp_id: 'O1' }]
});

const grad = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: { name: 'Screener: Graduate', position: [672, 300], parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: '${IDS.graduate}', cachedResultName: 'Screener: Graduate' },
    workflowInputs: { mappingMode: 'defineBelow',
      value: { contact_id: expr('{{ $json.contact_id }}'), screener_opp_id: expr('{{ $json.screener_opp_id }}') },
      matchingColumns: [],
      schema: [ { id: 'contact_id', displayName: 'contact_id', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' }, { id: 'screener_opp_id', displayName: 'screener_opp_id', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' } ],
      attemptToConvertTypes: false, convertFieldsToString: false },
    mode: 'each', options: { waitForSubWorkflow: true } } },
  output: [{ grad_key: 'C1:O1', ok: true }]
});

const note = sticky('## Screener: Graduate Sweep  (spec §8 · §10.2 item 6)\\nEvery 10 min: screener opportunities in Owner Verified for at least 10 min (the screener can still correct the mark inside that window) go through Screener: Graduate, one at a time. A lead whose graduation failed stays in Owner Verified and is picked up again.\\nKeep INACTIVE until the four GHL guard branches exist.', [find, pick, grad], { color: 5 });

export default workflow('screener-graduate-sweep', 'Screener: Graduate Sweep')
  .add(every).to(find).to(pick).to(grad)
  .add(note);
`);
