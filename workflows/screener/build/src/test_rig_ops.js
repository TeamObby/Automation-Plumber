// Test rig for the screener write-back, hard-wired to ONE contact: Dana Happy, the team test
// contact (spec, test rig 2026-09-23). It plays the screener (sets Screener Outcome, which n8n
// never writes in production) and resets the contact afterwards. It cannot touch any other record,
// except the one Kevin opportunity Screener: Graduate logged for this contact (ungraduate).
// Input: the screener_graduations row for the test contact (empty if Graduate never ran on it).
const CONTACT = '2Z5mwZe5RT4NQdNW85vj';
const OPP = 'FAstcBVvrgbpds2gQIV3';
const PIPELINE = 'CvDwpavqkHSRhg5Bn3L4';
const ATTEMPT_1 = '7ff9193f-1e0a-4c93-9626-a6aab22b666b';
const F = { outcome: 'iTZa77JWntQs2QBuo9QU', date: 'MUkHW8R17PIksrSnpz6g', noise: 'AbbR6jH9PFMLJCRdCqMp', verdict: 'boOwqb5qGOmbWBopWvTv', attempts: 'vcqKnq23gN5wIIHqRww4' };
const MARKS = ['Owner - Busy', 'Owner - Quiet', 'Gatekeeper', 'Not Sure', 'Wrong Number', 'Not A Plumber'];   // no Do Not Call: it sets DND on the demo record
const BLOCK_USERS = ['ZU6NEmag5FFcYAYwtu75', 'QKMhxRVQX45dq2bxF5a5', 'u24gWdO3FlXhwjwhm6sE', 'hdIv63msJcYjhwfIJ4eg', 'T4p1bK3yo6Bl14OK1LP3',
  'nTHz8ZbvpMxoWqsyJsLs', 'u1v0arwCtQw8kr9FSYIT', '7KI79ZeuhHa1WrmFSaPH', 'j5w26gAQTznnaAgqRePi', 'QlDlzTUPYag7RxkJ2B5Q'];
const TAGS = ['owner-confirmed', 'screen-busy', 'screen-quiet', 'screen-mismatch'].concat(
  ['06-07', '07-08', '08-09', '09-10', '10-11', '11-12', '12-13', '13-14', '14-15', '15-16'].map(b => 'screened-pt-' + b));
const GHL = 'https://services.leadconnectorhq.com';

const b = $('Webhook (test rig)').first().json.body || {};
const grad = $json || {};
const action = String(b.action || 'read');
const ops = [];
const op = (label, method, url, body) => ops.push({ label, method, url, body });
const reset = () => {
  op('clear screener fields', 'PUT', GHL + '/contacts/' + CONTACT, { customFields: Object.values(F).map(id => ({ id, value: '' })) });
  op('remove screener result tags', 'DELETE', GHL + '/contacts/' + CONTACT + '/tags', { tags: TAGS });
  op('add screening tag back', 'POST', GHL + '/contacts/' + CONTACT + '/tags', { tags: ['screening'] });
  op('opp open, back to Attempt 1', 'PUT', GHL + '/opportunities/' + OPP, { pipelineId: PIPELINE, pipelineStageId: ATTEMPT_1, status: 'open' });
  op('remove block followers', 'DELETE', GHL + '/opportunities/' + OPP + '/followers', { followers: BLOCK_USERS });
};

if (action === 'mark') {
  if (!MARKS.includes(b.outcome)) throw new Error('outcome must be one of: ' + MARKS.join(', '));
  op('set Screener Outcome = ' + b.outcome, 'PUT', GHL + '/contacts/' + CONTACT, { customFields: [ { id: F.outcome, value: b.outcome } ] });
} else if (action === 'reset') {
  reset();
} else if (action === 'ungraduate') {
  // Undo a Graduate test: delete only the opportunity Graduate logged as created for this contact.
  const kevin = String(grad.kevin_opp_id || '');
  if (grad.grad_key !== CONTACT + ':' + OPP || grad.created_new !== true || !kevin || kevin === OPP)
    throw new Error('no opportunity created by Screener: Graduate is logged for the test contact');
  op('delete the Kevin opp Graduate created (' + kevin + ')', 'DELETE', GHL + '/opportunities/' + kevin, {});
  reset();
} else if (action !== 'read') {
  throw new Error('action must be read, mark, reset or ungraduate');
}
return { json: { action, contact_id: CONTACT, opp_id: OPP, ops } };
