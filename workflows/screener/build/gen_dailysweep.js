// Screener: Daily Sweep (spec §7 freshness · §10.2 item 7b): the 14-day stale sweep, then the daily Slack summary.
const fs = require('fs'); const c = f => JSON.stringify(fs.readFileSync(__dirname + '/src/' + f, 'utf8'));
const { SB_CRED } = require('./log_supabase.js');
const SB = require('./supabase.json'); const SL = require('./slack.json');
const GHL_AUTH = `authentication: 'predefinedCredentialType', nodeCredentialType: 'httpMultipleHeadersAuth'`;
const GHL_CRED = `credentials: { httpMultipleHeadersAuth: { id: 'DtotRKnzjDewbSsv', name: 'GHL [ Waterline Growth subaccount ] Multiple Headers Auth account' } }`;
const T = (id, name) => `{ __rl: true, mode: 'id', value: '${id}', cachedResultName: '${name}' }`;
const cond = x => `{ options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [ { leftValue: expr('{{ ${x} }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ], combinator: 'and' }`;
const code = (v, name, pos, file, mode, out) => `const ${v} = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: '${name}', position: [${pos}], parameters: { mode: '${mode || 'runOnceForAllItems'}', jsCode: ${c(file)} } },
  output: [${out || '{}'}]
});`;
const get = (v, name, pos, url, extra = '') => `const ${v} = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: '${name}', position: [${pos}], retryOnFail: true, onError: 'continueRegularOutput'${extra},
    parameters: { url: ${url}, ${GHL_AUTH}, options: {} }, ${GHL_CRED} },
  output: [{}]
});`;
const dt = (v, name, pos, table, conds, limit) => `const ${v} = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: '${name}', position: [${pos}], executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput', parameters: { resource: 'row', operation: 'get', dataTableId: ${table}, matchType: 'allConditions',
    filters: { conditions: [ ${conds} ] }, returnAll: false, limit: ${limit} } },
  output: [{ id: 1 }]
});`;

fs.writeFileSync(__dirname + '/out/dailysweep.sdk.js', `import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

const daily = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.2,
  config: { name: 'Every day 05:00', position: [0, 300], parameters: { rule: { interval: [ { field: 'days', triggerAtHour: 5 } ] } } },
  output: [{}]
});

${code('settings', 'Settings', '224, 300', 'daily_settings.js', '', "{ dry_run: false, max_contacts: 50, stale_days: 14, screener_user_id: '', now_ms: 0, today_pt: '2026-09-25' }")}

const ownerSearch = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: owner-confirmed contacts', position: [448, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: 'https://services.leadconnectorhq.com/contacts/search', ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: '{"locationId":"rzaMhqeo2apNI1p6DG5z","pageLimit":100,"filters":[{"field":"tags","operator":"contains","value":["owner-confirmed"]}]}', options: {} }, ${GHL_CRED} },
  output: [{ contacts: [ { id: 'C1' } ], total: 1 }]
});

${code('searches', 'Stale searches', '672, 300', 'stale_searches.js', '', "{ label: 'Gatekeeper', url: 'https://x' }")}

${get('stageOpps', 'GHL: screener opps', '896, 300', "expr('{{ $json.url }}')")}

const pendRead = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Pending sweeps', position: [1008, 480], executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput', parameters: { resource: 'row', operation: 'get', dataTableId: ${T('J61RThPMfxykZt1N', 'screener_sweep_pending')}, matchType: 'allConditions',
    filters: { conditions: [] }, returnAll: false, limit: 100 } },
  output: [{ id: 1, contact_id: 'C1', ops_json: '[]', error: '500', queued_at: '2026-09-25T00:00:00.000Z', first_failed_at: '2026-09-25T00:00:00.000Z' }]
});

${code('candidates', 'Candidates', '1120, 300', 'stale_candidates.js', '', "{ contact_ids: ['C1'], sources: {}, search_errors: [], truncated: [] }")}

const anyCand = ifElse({ version: 2.2, config: { name: 'Any candidates?', position: [1344, 300], parameters: { conditions: ${cond('$json.contact_ids.length > 0')} } } });

const one = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'One contact', position: [1568, 200], parameters: { mode: 'runOnceForAllItems', jsCode: "return $('Candidates').first().json.contact_ids.map(contact_id => ({ json: { contact_id } }));\\n" } },
  output: [{ contact_id: 'C1' }]
});

${get('getContact', 'GHL: Get Contact', '1792, 200', "expr('https://services.leadconnectorhq.com/contacts/{{ $json.contact_id }}')")}

${get('allOpps', 'GHL: All Opps for Contact', '2016, 200', "expr(\"https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&status=all&limit=100&contact_id={{ $('One contact').item.json.contact_id }}\")")}

${code('decide', 'Decide', '2240, 200', 'stale_decide.js', 'runOnceForEachItem', "{ contact_id: 'C1', company: 'X', action: 'none', reason: '', age_days: 1, ops: [] }")}

${code('plan', 'Plan Sweep', '2464, 200', 'stale_plan.js', '', "{ dry_run: false, planned: [], deferred: [], blocked: [], errors: [], ops: [] }")}

const write = ifElse({ version: 2.2, config: { name: 'Write to GHL?', position: [2688, 200], parameters: { conditions: ${cond('$json.ops.length > 0')} } } });

const split = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Split Sweep Ops', position: [2912, 100], parameters: { mode: 'runOnceForAllItems', jsCode: "return $('Plan Sweep').first().json.ops.map(o => ({ json: o }));\\n" } },
  output: [{ contact_id: 'C1', label: 'x', method: 'PUT', url: 'https://x', body: {} }]
});

const apply = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'GHL: Sweep Apply', position: [3136, 100], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { method: expr('{{ $json.method }}'), url: expr('{{ $json.url }}'), ${GHL_AUTH},
      sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'),
      options: { batching: { batch: { batchSize: 1, batchInterval: 250 } } } }, ${GHL_CRED} },
  output: [{ succeeded: true }]
});

${code('report', 'Sweep Report', '3360, 300', 'stale_report.js', '', "{ dry_run: false, candidates: 0, expired: [], rescreened: [], blocked: [], errors: [], deferred: [], failed: [], search_errors: [], truncated: [] }")}

${code('pendChanges', 'Pending sweep changes', '3584, 560', 'sweep_pending_changes.js', '', "{ op: 'save', contact_id: 'C1' }")}

const pendIf = ifElse({ version: 2.2, config: { name: 'Save or clear?', position: [3808, 560], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [ { leftValue: expr('{{ $json.op }}'), rightValue: 'save', operator: { type: 'string', operation: 'equals' } } ], combinator: 'and' } } } });

const pendSave = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Save pending sweep', position: [4032, 480], retryOnFail: true, onError: 'continueRegularOutput', parameters: { resource: 'row', operation: 'upsert', dataTableId: ${T('J61RThPMfxykZt1N', 'screener_sweep_pending')}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'contact_id', condition: 'eq', keyValue: expr('{{ $json.contact_id }}') } ] },
    columns: { mappingMode: 'defineBelow', value: { contact_id: expr('{{ $json.contact_id }}'), ops_json: expr('{{ $json.ops_json }}'), error: expr('{{ $json.error }}'), queued_at: expr('{{ $json.queued_at }}'), first_failed_at: expr('{{ $json.first_failed_at }}') }, matchingColumns: [],
      schema: ${JSON.stringify(['contact_id', 'ops_json', 'error', 'queued_at', 'first_failed_at'].map(id => ({ id, displayName: id, required: false, defaultMatch: false, display: true, type: 'string', readOnly: false, removed: false })))},
      attemptToConvertTypes: false, convertFieldsToString: false }, options: {} } },
  output: [{ id: 1 }]
});

const pendClear = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Clear pending sweep', position: [4032, 640], retryOnFail: true, onError: 'continueRegularOutput', parameters: { resource: 'row', operation: 'deleteRows', dataTableId: ${T('J61RThPMfxykZt1N', 'screener_sweep_pending')}, matchType: 'allConditions',
    filters: { conditions: [ { keyName: 'contact_id', condition: 'eq', keyValue: expr('{{ $json.contact_id }}') } ] }, options: {} } },
  output: [{ id: 1 }]
});

${code('stageUrls', 'Stage count searches', '3584, 300', 'summary_stage_urls.js', '', "{ name: 'Attempt 1', url: 'https://x' }")}

${get('stageCounts', 'GHL: stage counts', '3808, 300', "expr('{{ $json.url }}')")}

const day = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: { name: 'Supabase: last 24h', position: [4032, 300], executeOnce: true, retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { url: '${(SB.url || 'https://SUPABASE-PROJECT-NOT-SET.supabase.co').replace(/\/+$/, '')}/rest/v1/screener_last_24h', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: {} },
    ${SB_CRED} },
  output: [{ calls: 0, compared: 0, matched: 0, owners: 0, no_answers: 0, voicemails: 0, bad_numbers: 0 }]
});

${dt('wb', 'Failed write-backs', '4256, 300', T('3WK4mrEYwvDeDUVO', 'screener_calls'), "{ keyName: 'writeback_ok', condition: 'eq', keyValue: expr('{{ false }}') }", 200)}

${dt('grads', 'Failed graduations', '4480, 300', T('1iX0aTvMYawwyH4H', 'screener_graduations'), "{ keyName: 'ok', condition: 'eq', keyValue: expr('{{ false }}') }", 100)}

${dt('pend', 'Pending log writes', '4704, 300', T('qKv7RxgTDsqb1plo', 'screener_log_pending'), '', 100)}

${code('build', 'Build Summary', '4928, 300', 'summary_build.js', '', "{ text: 'x', needs_human: false }")}

const slack = node({
  type: 'n8n-nodes-base.slack', version: 2.4,
  config: { name: 'Slack: daily summary', position: [5152, 300], retryOnFail: true, onError: 'continueRegularOutput',
    parameters: { resource: 'message', operation: 'post', authentication: 'accessToken', select: 'channel',
      channelId: { __rl: true, mode: 'name', value: '${SL.channel || '#SET-ME'}' }, messageType: 'text', text: expr('{{ $json.text }}'),
      otherOptions: { includeLinkToWorkflow: false, mrkdwn: true } }${SL.credential_id ? `,
    credentials: { slackApi: { id: '${SL.credential_id}', name: '${SL.credential_name}' } }` : ''} },
  output: [{ ok: true }]
});

const note = sticky('## Screener: Daily Sweep  (spec §7 · §10.2 item 7b)\\n1. Stale sweep. Leads tagged owner-confirmed, or in Gatekeeper / Not Sure / Exhausted, or graduated: Date Screened older than 14 days -> owner-confirmed, the screened-pt tag and the block followers come off (Kevin keeps working the lead, it just leaves the fresh hour lists). Gatekeeper / Not Sure / Exhausted / graduated owners go back to Attempt 1 with screening, but never with an open opportunity in Kevin pipelines (re-screen trap) and never DND. Max 50 contacts a run; DRY_RUN in Settings. A contact whose writes half fail is saved in screener_sweep_pending and finished next run, unless it moved since (then reported).\\n2. Daily summary to Slack: stage counts (empty Attempt 1 = load the next set), last 24 h from Supabase, what the sweep did, and what needs a human.\\nKeep INACTIVE until go-live.', [settings, decide, build], { color: 5 });

export default workflow('screener-daily-sweep', 'Screener: Daily Sweep')
  .add(daily).to(settings).to(ownerSearch).to(searches).to(stageOpps).to(pendRead).to(candidates)
  .to(anyCand.onTrue(one.to(getContact).to(allOpps).to(decide).to(plan).to(write.onTrue(split.to(apply).to(report)).onFalse(report))).onFalse(report))
  .add(report).to(pendChanges).to(pendIf.onTrue(pendSave).onFalse(pendClear))
  .add(report).to(stageUrls).to(stageCounts).to(day).to(wb).to(grads).to(pend).to(build).to(slack)
  .add(note);
`);
