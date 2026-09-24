// The Execute Workflow node that calls "Screener: Compare Step" — shared by Capture and Mark.
const COMPARE_ID = require('./ids.json').compare;
exports.callCompare = ({ pos, verdict, source, force = false }) => `const compare = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: { name: 'Screener: Compare Step', position: ${JSON.stringify(pos)}, parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: '${COMPARE_ID}', cachedResultName: 'Screener: Compare Step' },
    workflowInputs: { mappingMode: 'defineBelow',
      value: { contact_id: expr('{{ $json.contact_id }}'), verdict_json: ${verdict}, source: '${source}', force: ${force} },
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
const col = (id, type) => `{ id: '${id}', displayName: '${id}', required: false, defaultMatch: false, display: true, type: '${type}', readOnly: false, removed: false }`;
const upd = (name, pos, conditions, value, schema) => `node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: '${name}', position: ${JSON.stringify(pos)}, retryOnFail: true, parameters: { resource: 'row', operation: 'update', dataTableId: ${TABLE}, matchType: 'allConditions',
    filters: { conditions: [ ${conditions} ] },
    columns: { mappingMode: 'defineBelow', value: { ${value} }, matchingColumns: [], schema: [ ${schema} ],
      attemptToConvertTypes: false, convertFieldsToString: false }, options: {} } },
  output: [{ id: 4, call_id: '01a0c4d5' }]
})`;
const e = x => 'expr(' + JSON.stringify('{{ ' + x + ' }}') + ')';
exports.RESULT_LINE = "[$json.action, $json.result, $json.reason].concat($json.failed || []).filter(Boolean).join(' | ')";

// The Compare Step's outcome on a call's screener_calls row, versioned (codex review): a failure
// always lands and stamps writeback_fail_ms; a success only lands where writeback_fail_ms is OLDER
// than the moment its own run started reading GHL, so a run that began before a later failure can
// never clear it. The condition is in the update filter itself — no check-then-write gap.
exports.recordOutcome = ({ v, pos, callId, prefix = '' }) => {
  const [x, y] = pos, res = (prefix ? "'" + prefix + ": ' + " : '') + exports.RESULT_LINE;
  return `const ${v}If = ifElse({
  version: 2.2,
  config: { name: 'Write-back ok?', position: [${x}, ${y}], parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.ok === true }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ],
    combinator: 'and' } } }
});

const ${v}Ok = ${upd('Record Success (unless a newer failure)', [x + 224, y - 96],
  `{ keyName: 'call_id', condition: 'eq', keyValue: ${e(callId)} }, { keyName: 'writeback_fail_ms', condition: 'lt', keyValue: ${e('$json.run_started_ms')} }`,
  `writeback_ok: ${e('true')}, writeback_result: ${e(res)}`,
  [col('writeback_ok', 'boolean'), col('writeback_result', 'string')].join(', '))};

const ${v}Fail = ${upd('Record Failure', [x + 224, y + 96],
  `{ keyName: 'call_id', condition: 'eq', keyValue: ${e(callId)} }`,
  `writeback_ok: ${e('false')}, writeback_fail_ms: ${e('Date.now()')}, writeback_result: ${e(res)}`,
  [col('writeback_ok', 'boolean'), col('writeback_result', 'string'), col('writeback_fail_ms', 'number')].join(', '))};`;
};

// A failure only (the mark path records failures, never successes: a mark run has no call of its own).
exports.recordFailure = ({ name, pos, callId, result }) => upd(name, pos,
  `{ keyName: 'call_id', condition: 'eq', keyValue: ${e(callId)} }`,
  `writeback_ok: ${e('false')}, writeback_fail_ms: ${e('Date.now()')}, writeback_result: ${e(result)}`,
  [col('writeback_ok', 'boolean'), col('writeback_result', 'string'), col('writeback_fail_ms', 'number')].join(', '));
