const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const { callCompare, recordWriteback, RESULT_LINE, TABLE } = require('./call_compare.js');
const code=`import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const every = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.2,
  config: { name: 'Every 15 minutes', position: [0, 300], parameters: { rule: { interval: [ { field: 'minutes', minutesInterval: 15 } ] } } },
  output: [{}]
});

const pending = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Get rows: write-back not finished', position: [224, 300], parameters: { resource: 'row', operation: 'get', dataTableId: ${TABLE}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'ai_ok', condition: 'eq', keyValue: expr('{{ true }}') }, { keyName: 'writeback_ok', condition: 'eq', keyValue: expr('{{ false }}') } ] },
    returnAll: false, limit: 200, orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'DESC' } },
  output: [{ id: 4, call_id: '01a0c4d5', contact_id: 'C1', ai_ok: true, writeback_ok: false, answered_at: '2026-09-22T17:38:45.000Z', received_at: '2026-09-22T17:40:00.000Z' }]
});

const pick = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Pick newest per contact (48 h)', position: [448, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('pick_retries.js')} } },
  output: [{ id: 4, call_id: '01a0c4d5', contact_id: 'C1', ai_ok: true, writeback_ok: false }]
});

const verdictOut = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Verdict For Contact', position: [672, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('verdict_for_contact.js')} } },
  output: [{ call_id: '01a0c4d5', contact_id: 'C1', verdict_json: '{"call_id":"01a0c4d5","call_outcome":"owner"}' }]
});

${callCompare({ pos: [896, 300], verdict: "expr('{{ $json.verdict_json }}')", source: 'retry' })}

const record = ${recordWriteback({ pos: [1120, 300], callId: '$json.call_id', ok: '$json.ok === true', result: "'retry: ' + " + RESULT_LINE })};

const note = sticky('## Screener: Write-back Retry  (codex review of item 4)\\nThe durable retry: nothing re-sends GHL webhooks, so every call row whose GHL write-back did not finish (writeback_ok = false: a GHL error, an unreadable contact, or a verdict that could not be saved before the read) is re-run through the Compare Step every 15 min, save-first. Newest call per contact only; rows older than 48 h are left for a human.\\nKeep INACTIVE until the four GHL guard branches exist.', [pending, pick, compare], { color: 5 });

export default workflow('screener-writeback-retry', 'Screener: Write-back Retry')
  .add(every).to(pending).to(pick).to(verdictOut).to(compare).to(record)
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/retry.sdk.js',code);
