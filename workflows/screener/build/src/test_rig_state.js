// The contact and its screener opportunity as they are now: exactly what the Compare Step touches.
const F = { 'iTZa77JWntQs2QBuo9QU': 'screener_outcome', 'MUkHW8R17PIksrSnpz6g': 'date_screened',
  'AbbR6jH9PFMLJCRdCqMp': 'screen_noise', 'boOwqb5qGOmbWBopWvTv': 'screen_ai_verdict' };
const STAGES = { '7ff9193f-1e0a-4c93-9626-a6aab22b666b': 'Attempt 1', 'd3d8862e-bc2e-443f-97e6-f77e577ac09e': 'Attempt 2',
  'abb54fb0-dbfc-44d9-aa21-796b91b7540b': 'Attempt 3', 'ec53d2ba-8322-45d6-9d60-283cc4fc016e': 'Attempt 4',
  'c8e33d9d-fd1b-46f6-87a6-7cc47841642f': 'Owner Verified', 'f83777fa-1dc0-4163-aa84-ef501126d82b': 'Gatekeeper',
  '0c160182-e74d-4ace-9d3b-c4404043ef4b': 'Not Sure', 'c1db8172-84bf-45a1-8f0e-5625157574a5': 'Exhausted',
  '65f9e1b4-8688-456d-845e-ebe0781101b9': 'Disqualified' };
const c = ($('GHL: Read Contact').first().json || {}).contact || {};
const o = (($('GHL: Read Opp').first().json || {}).opportunities || []).find(x => x.id === 'FAstcBVvrgbpds2gQIV3') || {};
const fields = {};
for (const f of (c.customFields || [])) if (F[f.id]) fields[F[f.id]] = f.value;
const sent = (() => { try { return $('Split Rig Ops').all().map(i => i.json.label); } catch (e) { return []; } })();
const results = (() => { try { return $('GHL: Rig Apply').all().map(i => i.json); } catch (e) { return []; } })();
return [{ json: {
  action: $('Rig Ops').first().json.action,
  requests: sent.map((label, i) => label + (results[i] && results[i].error ? ' FAILED: ' + (results[i].error.message || '') : ' ok')),
  stage: STAGES[o.pipelineStageId] || o.pipelineStageId || '(no opp found)',
  followers: o.followers || [],
  tags: (c.tags || []).filter(t => /^(screening|owner-confirmed|screen-|screened-)/.test(t)).sort(),
  dnd: c.dnd,
  fields
} }];
