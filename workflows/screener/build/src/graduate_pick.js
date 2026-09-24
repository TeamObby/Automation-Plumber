// Screener opportunities ready to graduate (spec §8). Owner Verified for at least GRACE_MS, so a
// screener who corrects the mark within that window never sends the lead to Kevin. The sweep is the
// only caller and runs one lead at a time, so two runs can never create the same opportunity.
const GRACE_MS = 10 * 60 * 1000;
const OWNER_VERIFIED = 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f';
const PIPELINE = 'CvDwpavqkHSRhg5Bn3L4';
const now = Date.now();
const opps = (($input.first() || {}).json || {}).opportunities || [];
return opps
  .filter(o => o.pipelineId === PIPELINE && o.pipelineStageId === OWNER_VERIFIED && (o.status || 'open') === 'open')
  .filter(o => now - Date.parse(o.lastStageChangeAt || o.updatedAt || 0) >= GRACE_MS)
  .map(o => ({ json: { contact_id: String(o.contactId || (o.contact && o.contact.id) || ''), screener_opp_id: String(o.id) } }))
  .filter(i => i.json.contact_id);
