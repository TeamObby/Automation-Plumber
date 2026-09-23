const fs=require('fs'); const c=f=>JSON.stringify(fs.readFileSync(__dirname+'/src/'+f,'utf8'));
const code=`import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1,
  config: { name: 'When Called by Screener Capture', position: [0, 300],
    parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [ { name: 'transcript', type: 'string' }, { name: 'contact_name', type: 'string' } ] } } },
  output: [{ transcript: 'Ramirez Plumbing. It is just me, I own the shop.', contact_name: 'Ramirez Plumbing' }]
});

const prep = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Prep Transcript', position: [224, 300], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('prep_transcript.js')} } },
  output: [{ transcript: 'Ramirez Plumbing.', contact_name: 'Ramirez Plumbing', truncated: false, has_text: true, request: { model: 'gpt-4o-mini' } }]
});

const hasText = ifElse({
  version: 2.2,
  config: { name: 'Has transcript?', position: [448, 300], parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [ { leftValue: expr('{{ $json.has_text }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ],
    combinator: 'and' } } }
});

const classify = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'OpenAI: Classify Who Answered', position: [672, 208], retryOnFail: true, maxTries: 3, waitBetweenTries: 2000, onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: 'https://api.openai.com/v1/chat/completions', authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi',
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.request) }}'), options: {} },
    credentials: { openAiApi: { id: 'B4xA6dDfoOhHJMOo', name: 'OpenAI account' } } },
  output: [{ choices: [ { message: { content: '{"call_outcome":"owner","owner_reached":"yes","confidence":0.9,"evidence_quote":"I own the shop","owner_name":""}' } } ] }]
});

const parse = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Parse Verdict', position: [896, 208], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('parse_verdict.js')} } },
  output: [{ call_outcome: 'owner', owner_reached: 'yes', confidence: 0.9, evidence_quote: 'I own the shop', quote_verified: true, owner_name: '', model: 'gpt-4o-mini', truncated: false, ai_error: '' }]
});

const noText = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'No Transcript Verdict', position: [672, 400], parameters: { mode: 'runOnceForEachItem', jsCode: ${c('no_transcript_verdict.js')} } },
  output: [{ call_outcome: 'unclear', owner_reached: 'unclear', confidence: 0, evidence_quote: '', quote_verified: false, owner_name: '', model: '', truncated: false, ai_error: 'no transcript' }]
});

const note = sticky('## Screener: Classify Transcript\\nInput: transcript (+ contact_name). Output: call_outcome, owner_reached, confidence, evidence_quote, quote_verified, owner_name.\\nThe AI owns who-answered only; busy/quiet is the screener\\'s mark (spec §4). Strict JSON schema, temperature 0. Called by Screener: Capture Call and by the Classifier Eval harness.', [prep, classify, parse], { color: 5 });

export default workflow('screener-classify', 'Screener: Classify Transcript')
  .add(whenCalled)
  .to(prep)
  .to(hasText.onTrue(classify.to(parse)).onFalse(noText))
  .add(note);
`;
fs.writeFileSync(__dirname+'/out/classifier.sdk.js',code); console.log(code.length);
