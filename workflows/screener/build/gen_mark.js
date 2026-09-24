const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const { callCompare, recordWriteback, TABLE } = require('./call_compare.js');
const code=`import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const hook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Webhook (Screener Outcome Changed)', position: [0, 300], parameters: { httpMethod: 'POST', path: 'screener-outcome', options: {} } },
  output: [{ body: { contact_id: 'C1', customData: { contact_id: 'C1', screener_outcome: 'Owner - Busy' } } }]
});

const normalize = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Normalize Mark', position: [224, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('normalize_mark.js')} } },
  output: [{ contact_id: 'C1', mark_in_payload: 'Owner - Busy', received_at: '2026-09-23T16:40:30.000Z' }]
});

const hasContact = node({
  type: 'n8n-nodes-base.filter', version: 2.2,
  config: { name: 'Filter: has contact_id', position: [448, 300], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.contact_id }}'), rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } } ], combinator: 'and' }, options: {} } },
  output: [{ contact_id: 'C1' }]
});

${callCompare({ pos: [672, 300], verdict: "''", source: 'mark' })}

// A failed compare on the mark path must not leave the call row marked done (codex review):
// set writeback_ok = false on the newest call row of this contact, so Screener: Write-back Retry reruns it.
const failedOnly = node({
  type: 'n8n-nodes-base.filter', version: 2.2,
  config: { name: 'Filter: compare failed', position: [896, 300], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.ok }}'), rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } } ], combinator: 'and' }, options: {} } },
  output: [{ contact_id: 'C1', ok: false }]
});

const latest = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Find newest call row for contact', position: [1120, 300], parameters: { resource: 'row', operation: 'get', dataTableId: ${TABLE}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'contact_id', condition: 'eq', keyValue: expr('{{ $json.contact_id }}') } ] },
    returnAll: false, limit: 1, orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'DESC' } },
  output: [{ id: 4, call_id: '01a0c4d5', contact_id: 'C1' }]
});

const record = ${recordWriteback({ name: 'Record Mark Failure', pos: [1344, 300], callId: '$json.call_id', ok: 'false',
  result: "'mark: ' + [$('Screener: Compare Step').first().json.action, $('Screener: Compare Step').first().json.reason].concat($('Screener: Compare Step').first().json.failed || []).filter(Boolean).join(' | ')" })};

const note = sticky('## Screener: Mark + Compare  (spec §9 event 2 · §10.2 item 4)\\nGHL Contact Changed → Screener Outcome (the pick the screener made) → the shared Compare Step. The mark itself is re-read from the contact there, so only contact_id matters here. If the compare fails, the newest call row of that contact gets writeback_ok = false so Screener: Write-back Retry reruns it.\\nKeep INACTIVE until the four GHL guard branches exist.', [normalize, compare], { color: 5 });

export default workflow('screener-mark-compare', 'Screener: Mark + Compare')
  .add(hook).to(normalize).to(hasContact).to(compare).to(failedOnly).to(latest).to(record)
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/mark.sdk.js',code);
