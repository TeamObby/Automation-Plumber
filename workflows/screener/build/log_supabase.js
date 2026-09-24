// The screener_log write (item 7a), shared by the Compare Step and the Attempt Counter: build the row,
// upsert it into Supabase over PostgREST (merge on event_key), then hand back the output the workflow
// returned before, so callers of the sub-workflow see no change. A Supabase failure never fails the run.
const fs = require('fs');
const SB = require('./supabase.json');
const URL = (SB.url || 'https://SUPABASE-PROJECT-NOT-SET.supabase.co').replace(/\/+$/, '');
exports.configured = !!(SB.url && SB.credential_id);
const c = f => JSON.stringify(fs.readFileSync(__dirname + '/src/' + f, 'utf8'));
exports.logNodes = ({ builder, x, y, returnFrom }) => `const logBuild = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Build Log Row', position: [${x}, ${y}], parameters: { mode: 'runOnceForAllItems', jsCode: ${c(builder)} } },
  output: [{ log: true, row: { event_key: 'call:C1', event: 'call' } }]
});

const logIf = ifElse({ version: 2.2, config: { name: 'Log it?', position: [${x + 224}, ${y}], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [ { leftValue: expr('{{ $json.log === true }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ], combinator: 'and' } } } });

const logUpsert = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'Supabase: screener_log', position: [${x + 448}, ${y - 96}], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: '${URL}/rest/v1/screener_log?on_conflict=event_key',
      authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi',
      sendHeaders: true, headerParameters: { parameters: [ { name: 'Prefer', value: 'resolution=merge-duplicates,return=minimal' } ] },
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.row) }}'), options: {} },
    credentials: { supabaseApi: { id: '${SB.credential_id || 'SET-ME'}', name: '${SB.credential_name || 'Supabase (not set)'}' } } },
  output: [{}]
});

const logReturn = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Return', position: [${x + 672}, ${y}], parameters: { mode: 'runOnceForAllItems', jsCode: ${JSON.stringify("// The sub-workflow's result, unchanged by the log write.\nreturn $('" + returnFrom + "').all().map(i => ({ json: i.json }));\n")} } },
  output: [{ ok: true }]
});`;
exports.logChain = `logBuild.to(logIf.onTrue(logUpsert.to(logReturn)).onFalse(logReturn))`;
