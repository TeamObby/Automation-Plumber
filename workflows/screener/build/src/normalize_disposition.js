// GHL "Capture Wavv Disposition" screener branch: the WAVV note, e.g.
//   [ WAVV: 019f71fc-... ] To: ... From: ... Duration: 8 seconds Disposition: Voicemail Tag: wavv-voicemail (15) Note: Auto-disposition
// Only the two AUTO-dispositions that nothing else counts are acted on (spec §9 event 4):
//   Voicemail -> an attempt; Bad Number -> Disqualified. No Answer / Canceled are counted by the
// no-answer webhook (WAVV writes a note for those too — counting both would double every dial);
// answered-call dispositions belong to the Compare Step.
const b = ($json && $json.body) ? $json.body : $json;
const cd = b.customData || {};
const raw = String(cd.note || b.note || '');
const idm = raw.match(/\[\s*WAVV:\s*([^\]\s]+)\s*\]/i);
const dm = raw.match(/Disposition:\s*([\s\S]*?)\s*Tag:/i);
const disp = dm ? dm[1].trim().toLowerCase().replace(/\s+/g, '-') : '';
const event = disp === 'voicemail' ? 'voicemail' : (disp === 'bad-number' ? 'bad-number' : '');
const wavv_call_id = idm ? idm[1] : '';
const now = Date.now();
return { json: {
  contact_id: String(b.contact_id || cd.contact_id || '').trim(),
  event, disposition: disp, wavv_call_id,
  event_key: wavv_call_id ? 'wavv:' + wavv_call_id : '',
  at_ms: now, received_at: new Date(now).toISOString()
}};
