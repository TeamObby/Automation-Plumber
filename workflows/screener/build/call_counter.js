// The Execute Workflow node that hands one attempt event to "Screener: Attempt Counter".
const ID = require('./ids.json').counter;
const f = ['contact_id', 'event', 'wavv_call_id', 'event_key', 'at_ms', 'received_at'];
exports.callCounter = pos => `const counter = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: { name: 'Screener: Attempt Counter', position: ${JSON.stringify(pos)}, parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: '${ID}', cachedResultName: 'Screener: Attempt Counter' },
    workflowInputs: { mappingMode: 'defineBelow',
      value: { ${f.map(k => `${k}: expr('{{ $json.${k} }}')`).join(', ')} },
      matchingColumns: [],
      schema: [ ${f.map(k => `{ id: '${k}', displayName: '${k}', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: '${k === 'at_ms' ? 'number' : 'string'}' }`).join(', ')} ],
      attemptToConvertTypes: false, convertFieldsToString: false },
    mode: 'each', options: { waitForSubWorkflow: true } } },
  output: [{ event_key: 'na:C1:1', attempt_no: 1, action: 'apply', result_stage: 'Attempt 2', ok: true }]
});`;
