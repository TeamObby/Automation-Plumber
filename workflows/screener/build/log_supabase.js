// The screener_log write (item 7a), shared by the Compare Step and the Attempt Counter: build the row,
// write it through the Supabase function screener_log_upsert (versioned on decided_ms, so a late or
// replayed write never overwrites a newer decision), queue it in screener_log_pending if that write
// fails, then hand back the output the workflow returned before. A log failure never fails the run.
const fs = require('fs');
const SB = require('./supabase.json');
const URL = (SB.url || 'https://SUPABASE-PROJECT-NOT-SET.supabase.co').replace(/\/+$/, '');
exports.configured = !!(SB.url && SB.credential_id);
exports.RPC_URL = URL + '/rest/v1/rpc/screener_log_upsert';
exports.SB_CRED = `credentials: { supabaseApi: { id: '${SB.credential_id || 'SET-ME'}', name: '${SB.credential_name || 'Supabase (not set)'}' } }`;
exports.PENDING = `{ __rl: true, mode: 'id', value: 'qKv7RxgTDsqb1plo', cachedResultName: 'screener_log_pending' }`;
const PCOLS = ['pending_key', 'event_key', 'row_json', 'error', 'queued_at'];
exports.PENDING_SCHEMA = JSON.stringify(PCOLS.map(id => ({ id, displayName: id, required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false })));
const c = f => JSON.stringify(fs.readFileSync(__dirname + '/src/' + f, 'utf8'));
const cond = x => `{ options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [ { leftValue: expr('{{ ${x} }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ], combinator: 'and' }`;
exports.logNodes = ({ builder, x, y, returnFrom }) => `const logBuild = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Build Log Row', position: [${x}, ${y}], parameters: { mode: 'runOnceForAllItems', jsCode: ${c(builder)} } },
  output: [{ log: true, row: { event_key: 'call:C1', event: 'call', decided_ms: 1 } }]
});

const logIf = ifElse({ version: 2.2, config: { name: 'Log it?', position: [${x + 224}, ${y}], parameters: { conditions: ${cond('$json.log === true')} } } });

const logUpsert = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'Supabase: screener_log', position: [${x + 448}, ${y - 96}], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: '${exports.RPC_URL}',
      authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi',
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify({ r: $json.row }) }}'), options: {} },
    ${exports.SB_CRED} },
  output: [{}]
});

const logFailed = ifElse({ version: 2.2, config: { name: 'Log write failed?', position: [${x + 672}, ${y - 96}], parameters: { conditions: ${cond('!!$json.error')} } } });

const logQueue = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Queue Pending Log', position: [${x + 896}, ${y - 192}], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('log_queue_row.js')} } },
  output: [{ pending_key: 'call:C1@1', event_key: 'call:C1', row_json: '{}', error: '503', queued_at: '2026-09-25T00:00:00.000Z' }]
});

const logQueueStore = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Store: screener_log_pending', position: [${x + 1120}, ${y - 192}], retryOnFail: true, onError: 'continueRegularOutput', parameters: { resource: 'row', operation: 'upsert', dataTableId: ${exports.PENDING}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'pending_key', condition: 'eq', keyValue: expr('{{ $json.pending_key }}') } ] },
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: ${exports.PENDING_SCHEMA}, attemptToConvertTypes: false, convertFieldsToString: false }, options: {} } },
  output: [{ id: 1, pending_key: 'call:C1@1' }]
});

const logReturn = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Return', position: [${x + 1344}, ${y}], parameters: { mode: 'runOnceForAllItems', jsCode: ${JSON.stringify("// The sub-workflow's result, unchanged by the log write.\nreturn $('" + returnFrom + "').all().map(i => ({ json: i.json }));\n")} } },
  output: [{ ok: true }]
});`;
exports.logChain = `logBuild.to(logIf.onTrue(logUpsert.to(logFailed.onTrue(logQueue.to(logQueueStore).to(logReturn)).onFalse(logReturn))).onFalse(logReturn))`;
