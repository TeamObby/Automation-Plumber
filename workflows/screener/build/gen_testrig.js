const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const GHL_AUTH = `authentication: 'predefinedCredentialType', nodeCredentialType: 'httpMultipleHeadersAuth'`;
const GHL_CRED = `credentials: { httpMultipleHeadersAuth: { id: 'DtotRKnzjDewbSsv', name: 'GHL [ Waterline Growth subaccount ] Multiple Headers Auth account' } }`;
const code=`import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const hook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Webhook (test rig)', position: [0, 300], parameters: { httpMethod: 'POST', path: 'screener-test-rig', options: {} } },
  output: [{ body: { action: 'mark', outcome: 'Owner - Busy' } }]
});

const rigOps = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Rig Ops', position: [224, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('test_rig_ops.js')} } },
  output: [{ action: 'mark', contact_id: '2Z5mwZe5RT4NQdNW85vj', opp_id: 'FAstcBVvrgbpds2gQIV3', ops: [ { label: 'x', method: 'PUT', url: 'https://services.leadconnectorhq.com/contacts/2Z5mwZe5RT4NQdNW85vj', body: {} } ] }]
});

const hasOps = ifElse({
  version: 2.2,
  config: { name: 'Anything to write?', position: [448, 300], parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.ops.length > 0 }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ],
    combinator: 'and' } } }
});

const split = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Split Rig Ops', position: [672, 208], parameters: { mode: 'runOnceForAllItems', jsCode: "return $('Rig Ops').first().json.ops.map(o => ({ json: o }));\\n" } },
  output: [{ label: 'x', method: 'PUT', url: 'https://services.leadconnectorhq.com/contacts/2Z5mwZe5RT4NQdNW85vj', body: {} }]
});

const apply = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Rig Apply', position: [896, 208], onError: 'continueRegularOutput',
    parameters: { method: expr('{{ $json.method }}'), url: expr('{{ $json.url }}'), ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'),
      options: { batching: { batch: { batchSize: 1, batchInterval: 250 } } } },
    ${GHL_CRED} },
  output: [{ succeeded: true }]
});

const once = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Then read back', position: [1120, 300], parameters: { mode: 'runOnceForAllItems', jsCode: "return [{ json: {} }];\\n" } },
  output: [{}]
});

const readContact = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Read Contact', position: [1344, 300], onError: 'continueRegularOutput',
    parameters: { url: 'https://services.leadconnectorhq.com/contacts/2Z5mwZe5RT4NQdNW85vj', ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{ contact: { id: '2Z5mwZe5RT4NQdNW85vj', tags: ['screening'], customFields: [] } }]
});

const readOpp = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Read Opp', position: [1568, 300], onError: 'continueRegularOutput',
    parameters: { url: 'https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&pipeline_id=CvDwpavqkHSRhg5Bn3L4&contact_id=2Z5mwZe5RT4NQdNW85vj&limit=20', ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{ opportunities: [ { id: 'FAstcBVvrgbpds2gQIV3', pipelineStageId: '7ff9193f-1e0a-4c93-9626-a6aab22b666b', followers: [] } ] }]
});

const state = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'State', position: [1792, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('test_rig_state.js')} } },
  output: [{ action: 'read', stage: 'Attempt 1', followers: [], tags: ['screening'], fields: {} }]
});

const note = sticky('## Screener: Test Rig  (manual only, never activate)\\nHard-wired to the team test contact Dana Happy 2Z5mwZe5RT4NQdNW85vj and its screener opp FAstcBVvrgbpds2gQIV3. Body action: read (state only), mark (outcome: plays the screener by setting Screener Outcome), reset (clears the five screener fields incl. Screen Attempts, tags, block followers, opp back to Attempt 1). Do Not Call is refused: it would set DND on the receptionist demo record.', [rigOps, apply, state], { color: 3 });

export default workflow('screener-test-rig', 'Screener: Test Rig')
  .add(hook).to(rigOps)
  .to(hasOps.onTrue(split.to(apply).to(once)).onFalse(once))
  .add(once).to(readContact).to(readOpp).to(state)
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/testrig.sdk.js',code);
