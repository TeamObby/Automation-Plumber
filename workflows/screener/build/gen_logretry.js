// Screener: Log Retry (item 7a, codex review 2026-09-25): replays screener_log payloads whose Supabase
// write failed, into Supabase only. The upsert is versioned, so a replay can never overwrite a newer row.
const fs = require('fs'); const c = f => JSON.stringify(fs.readFileSync(__dirname + '/src/' + f, 'utf8'));
const { RPC_URL, SB_CRED, PENDING } = require('./log_supabase.js');
fs.writeFileSync(__dirname + '/out/logretry.sdk.js', `import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const every = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.2,
  config: { name: 'Every 15 minutes', position: [0, 300], parameters: { rule: { interval: [ { field: 'minutes', minutesInterval: 15 } ] } } },
  output: [{}]
});

const pending = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Get pending log rows', position: [224, 300], parameters: { resource: 'row', operation: 'get', dataTableId: ${PENDING}, matchType: 'allConditions',
    filters: { conditions: [] }, returnAll: false, limit: 100, orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'ASC' } },
  output: [{ id: 1, pending_key: 'call:C1@1', event_key: 'call:C1', row_json: '{}', error: '503' }]
});

const pick = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Pick replays', position: [448, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('log_retry_pick.js')} } },
  output: [{ id: 1, pending_key: 'call:C1@1', body: { r: { event_key: 'call:C1' } } }]
});

const replay = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'Supabase: replay screener_log', position: [672, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: '${RPC_URL}', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi',
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'),
      options: { batching: { batch: { batchSize: 1, batchInterval: 200 } } } },
    ${SB_CRED} },
  output: [{}]
});

const pair = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Replayed OK', position: [896, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${JSON.stringify("// Pair each replay with its pending row; only a successful one is removed from the queue.\nconst sent = $('Pick replays').all().map(i => i.json);\nreturn $input.all().map((r, i) => ({ json: { id: sent[i] && sent[i].id, pending_key: sent[i] && sent[i].pending_key, ok: !(r.json && r.json.error) } }))\n  .filter(x => x.json.id && x.json.ok);\n")} } },
  output: [{ id: 1, pending_key: 'call:C1@1', ok: true }]
});

const del = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Delete replayed row', position: [1120, 300], parameters: { resource: 'row', operation: 'deleteRows', dataTableId: ${PENDING}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'id', condition: 'eq', keyValue: expr('{{ $json.id }}') } ] }, options: {} } },
  output: [{ id: 1 }]
});

const note = sticky('## Screener: Log Retry  (item 7a)\\nEvery 15 min: screener_log payloads whose Supabase write failed (screener_log_pending) are replayed through screener_log_upsert, Supabase only, never GHL. The upsert is versioned on decided_ms, so an old replay cannot overwrite a newer row. A replayed row leaves the queue; a failed one stays for the next run and for the daily summary.', [pick, replay, del], { color: 5 });

export default workflow('screener-log-retry', 'Screener: Log Retry')
  .add(every).to(pending).to(pick).to(replay).to(pair).to(del)
  .add(note);
`);
