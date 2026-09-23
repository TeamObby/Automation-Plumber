const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const code=`import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Run Eval', position: [0, 300] }, output: [{}] });

const load = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Load Fixtures', position: [224, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('load_fixtures.js')} } },
  output: [{ id: 'owner-explicit', contact_name: 'Ramirez Plumbing', transcript: 'Ramirez Plumbing. I own the shop.', expect: { call_outcome: ['owner'], owner_reached: ['yes'] }, run: 1 }]
});

const classify = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: { name: 'Screener: Classify Transcript', position: [448, 300], parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: 'LbGY5ptzldJjnTZJ', cachedResultName: 'Screener: Classify Transcript' },
    workflowInputs: { mappingMode: 'defineBelow',
      value: { transcript: expr('{{ $json.transcript }}'), contact_name: expr('{{ $json.contact_name }}') },
      matchingColumns: [],
      schema: [
        { id: 'transcript', displayName: 'transcript', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
        { id: 'contact_name', displayName: 'contact_name', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' }
      ],
      attemptToConvertTypes: false, convertFieldsToString: true },
    mode: 'each', options: { waitForSubWorkflow: true } } },
  output: [{ call_outcome: 'owner', owner_reached: 'yes', confidence: 0.9, evidence_quote: 'I own the shop', quote_verified: true, owner_name: '', model: 'gpt-4o-mini', truncated: false, ai_error: '' }]
});

const score = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Score Stability + Accuracy', position: [672, 300], parameters: { mode: 'runOnceForAllItems', jsCode: ${c('score.js')} } },
  output: [{ passed: true, stable: 8, correct: 8, total: 8, cases: [] }]
});

const note = sticky('## Screener: Classifier Eval\\nTest harness, not part of the live flow. Runs the 8 hand-written transcripts (tests/fixtures/screener-transcripts.json) through the classifier 3x each. "Done" for spec §10.2 item 2 = passed:true (every case stable across runs AND matching its expected label). Re-run after any prompt or model change.', [load, classify, score], { color: 3 });

export default workflow('screener-classifier-eval', 'Screener: Classifier Eval')
  .add(start).to(load).to(classify).to(score)
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/eval.sdk.js',code);
