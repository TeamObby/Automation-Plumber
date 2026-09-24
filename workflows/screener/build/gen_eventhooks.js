// The two thin webhook workflows in front of Screener: Attempt Counter (spec §9 events 3 and 4).
// Separate workflows because the MCP's manual webhook test always feeds the FIRST webhook trigger.
const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const { callCounter } = require('./call_counter.js');
const make = (id, name, path, normName, src, sample, stickyText) => fs.writeFileSync(__dirname+'/out/'+id+'.sdk.js', `import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const hook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Webhook (${name})', position: [0, 300], parameters: { httpMethod: 'POST', path: '${path}', options: {} } },
  output: [${sample}]
});

const normalize = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: '${normName}', position: [224, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c(src)} } },
  output: [{ contact_id: 'C1', event: 'no-answer', wavv_call_id: '', event_key: 'na:C1:1', at_ms: 1, received_at: '2026-09-24T00:00:00.000Z' }]
});

const countable = node({
  type: 'n8n-nodes-base.filter', version: 2.2,
  config: { name: 'Filter: a countable event', position: [448, 300], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.contact_id }}'), rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } }, { leftValue: expr('{{ $json.event }}'), rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } } ], combinator: 'and' }, options: {} } },
  output: [{ contact_id: 'C1', event: 'no-answer' }]
});

${callCounter([672, 300])}

const note = sticky(${JSON.stringify(stickyText)}, [normalize, counter], { color: 5 });

export default workflow('${'screener-' + id}', 'Screener: ${name}')
  .add(hook).to(normalize).to(countable).to(counter)
  .add(note);
`);
make('noanswer', 'No Answer', 'screener-no-answer', 'Normalize No Answer', 'normalize_no_answer.js', "{ body: { contact_id: 'C1' } }",
  '## Screener: No Answer  (spec §9 event 3 · §10.2 item 5)\nGHL Call No Answer, screener branch (tag wavv-no-answer / wavv-canceled on a contact tagged screening) → Screener: Attempt Counter. One unanswered dial = one attempt.\nKeep INACTIVE until the four GHL guard branches exist.');
make('disposition', 'WAVV Disposition', 'screener-disposition', 'Normalize Disposition', 'normalize_disposition.js',
  "{ body: { contact_id: 'C1', customData: { note: '[ WAVV: 019f71fc ] Disposition: Voicemail Tag: wavv-voicemail (15) Note: Auto-disposition' } } }",
  '## Screener: WAVV Disposition  (spec §9 event 4 · §10.2 item 5)\nGHL Capture Wavv Disposition, screener branch (Branch A only) → the WAVV note. Voicemail = an attempt, Bad Number = Disqualified; every other disposition is ignored here (No Answer / Canceled are counted by Screener: No Answer). → Screener: Attempt Counter.\nKeep INACTIVE until the four GHL guard branches exist.');
