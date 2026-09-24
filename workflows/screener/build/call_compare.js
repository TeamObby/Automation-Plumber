// The Execute Workflow node that calls "Screener: Compare Step" — shared by Capture and Mark.
const COMPARE_ID = require('./ids.json').compare;
exports.callCompare = ({ pos, verdict, source }) => `const compare = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: { name: 'Screener: Compare Step', position: ${JSON.stringify(pos)}, parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: '${COMPARE_ID}', cachedResultName: 'Screener: Compare Step' },
    workflowInputs: { mappingMode: 'defineBelow',
      value: { contact_id: expr('{{ $json.contact_id }}'), verdict_json: ${verdict}, source: '${source}', force: false },
      matchingColumns: [],
      schema: [
        { id: 'contact_id', displayName: 'contact_id', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
        { id: 'verdict_json', displayName: 'verdict_json', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
        { id: 'source', displayName: 'source', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
        { id: 'force', displayName: 'force', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'boolean' }
      ],
      attemptToConvertTypes: false, convertFieldsToString: false },
    mode: 'each', options: { waitForSubWorkflow: true } } },
  output: [{ contact_id: 'C1', action: 'apply', result: 'Owner Verified', reason: '', mismatch: false, notes: [], requests: 3, failed: [], ok: true }]
});`;

// Data table screener_calls, and the node that stores the Compare Step's outcome on a call's row.
const TABLE = `{ __rl: true, mode: 'id', value: '3WK4mrEYwvDeDUVO', cachedResultName: 'screener_calls' }`;
exports.TABLE = TABLE;
const WB_SCHEMA = `[
        { id: 'writeback_ok', displayName: 'writeback_ok', required: false, defaultMatch: false, display: true, type: 'boolean', readOnly: false, removed: false },
        { id: 'writeback_result', displayName: 'writeback_result', required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false } ]`;
exports.recordWriteback = ({ name = 'Record Write-back', pos, callId, ok, result }) => `node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: '${name}', position: ${JSON.stringify(pos)}, retryOnFail: true, parameters: { resource: 'row', operation: 'update', dataTableId: ${TABLE}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'call_id', condition: 'eq', keyValue: expr(${JSON.stringify('{{ ' + callId + ' }}')}) } ] },
    columns: { mappingMode: 'defineBelow',
      value: { writeback_ok: expr(${JSON.stringify('{{ ' + ok + ' }}')}), writeback_result: expr(${JSON.stringify('{{ ' + result + ' }}')}) },
      matchingColumns: [], schema: ${WB_SCHEMA},
      attemptToConvertTypes: false, convertFieldsToString: false }, options: {} } },
  output: [{ id: 4, call_id: '01a0c4d5', writeback_ok: true }]
})`;
exports.RESULT_LINE = "[$json.action, $json.result, $json.reason].concat($json.failed || []).filter(Boolean).join(' | ')";
