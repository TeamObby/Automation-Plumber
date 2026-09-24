// Graduation (spec §8): the only exit from the screener into Kevin's machine.
// Kevin's opportunity goes where Import Contact To New would have put it: an email -> Client
// Acquisition / New, no email -> Cold Outbound Call / Day 1 Call A. If the contact already has an
// open opportunity in Kevin's pipelines (the re-screen trap, or a retry after a partial failure),
// that one is reused and nothing new is created.
const OWNER_VERIFIED = 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f';
const CLIENT_ACQ = { pipelineId: 'O7LMZpDOFM2SYO65twC5', pipelineStageId: 'f6aa7e0f-6b83-4a7b-b8b9-620753554b3a', name: 'Client Acquisition / New' };
const COLD_CALL  = { pipelineId: '9E6y34DlG1Imr8FV42RV', pipelineStageId: '060f44a8-4cd8-4561-8c84-7150bfd57498', name: 'Cold Outbound Call / Day 1 Call A' };
const LOCATION = 'rzaMhqeo2apNI1p6DG5z';
// Kevin's campaign pipelines (AGENTS.md). Only an open opportunity in one of these counts as "already
// in Kevin's machine"; a contact can have opportunities in unrelated pipelines (the test contact is
// also the AI-receptionist demo record), and reusing one of those would strand the lead. Manual Review
// Needed (OOu5TjgalfGZElEIoSbq) is left out on purpose: it is a task for a human, not a sales or call
// queue, so a lead whose only open opportunity is there still gets a real one.
const KEVIN_PIPELINES = ['O7LMZpDOFM2SYO65twC5', '1A1RkYaL93s2rqbQ3Opi', '9E6y34DlG1Imr8FV42RV', '3onA8GkJnSwgzIGTGSpI',
  'TwW6o0JdPXUlcwvX0EvI', 'smoNRUaagZYOElKFLwtp'];
const BLOCK_USER = {
  'PT 06-07': 'ZU6NEmag5FFcYAYwtu75', 'PT 07-08': 'QKMhxRVQX45dq2bxF5a5',
  'PT 08-09': 'u24gWdO3FlXhwjwhm6sE', 'PT 09-10': 'hdIv63msJcYjhwfIJ4eg',
  'PT 10-11': 'T4p1bK3yo6Bl14OK1LP3', 'PT 11-12': 'nTHz8ZbvpMxoWqsyJsLs',
  'PT 12-13': 'u1v0arwCtQw8kr9FSYIT', 'PT 13-14': '7KI79ZeuhHa1WrmFSaPH',
  'PT 14-15': 'j5w26gAQTznnaAgqRePi', 'PT 15-16': 'QlDlzTUPYag7RxkJ2B5Q'
};

const input = $('When Called (graduate)').first().json;
const got = $('GHL: Get Contact').first().json;
const found = $('GHL: All Opps for Contact').first().json;
const contact = (got && got.contact) || null;
const s = v => String(v == null ? '' : v).trim();
const out = (action, reason, extra) => ({ json: Object.assign({
  contact_id: s(input.contact_id), screener_opp_id: s(input.screener_opp_id), action, reason,
  retry: false, create: null, kevin_opp_id: '', kevin_pipeline: '', pt_block: '', block_user: '', remove_tags: []
}, extra) });

if (!contact || !contact.id) return out('skip', 'contact not readable', { retry: true });
if (!found || found.error) return out('skip', 'opportunity search failed', { retry: true });
const tags = (contact.tags || []).map(t => s(t).toLowerCase());
if (!tags.includes('owner-confirmed')) return out('skip', 'contact is not owner-confirmed');
const opps = found.opportunities || [];
const mine = opps.find(o => s(o.id) === s(input.screener_opp_id));
if (!mine || (mine.status || 'open') !== 'open' || mine.pipelineStageId !== OWNER_VERIFIED)
  return out('skip', 'screener opportunity is no longer open in Owner Verified');

const block = (tags.find(t => /^screened-pt-\d\d-\d\d$/.test(t)) || '').replace('screened-pt-', 'PT ');
const existing = opps.find(o => KEVIN_PIPELINES.includes(o.pipelineId) && (o.status || 'open') === 'open');
const target = s(contact.email) ? CLIENT_ACQ : COLD_CALL;
const name = s(contact.companyName) || s([contact.firstName, contact.lastName].filter(Boolean).join(' ')) || s(contact.contactName) || 'Plumber';
return out('graduate', existing ? 'already has an open opportunity in Kevin’s pipelines: reused' : 'new opportunity in ' + target.name, {
  create: existing ? null : { pipelineId: target.pipelineId, pipelineStageId: target.pipelineStageId, locationId: LOCATION, contactId: s(contact.id), name, status: 'open' },
  kevin_opp_id: existing ? s(existing.id) : '',
  kevin_pipeline: existing ? s(existing.pipelineId) : target.name,
  pt_block: block, block_user: BLOCK_USER[block] || '',
  remove_tags: tags.filter(t => t === 'screening' || t.startsWith('wavv-'))
});
