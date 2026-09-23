// GHL "Call Recorded" webhook for a screener call. WAVV's fields arrive under customData.
const b = ($json && $json.body) ? $json.body : $json;
const cd = b.customData || {};
const s = v => String(v == null ? '' : v).trim();

// The hour block the owner was reached in: always Pacific, even for an Eastern lead (spec §6).
// Ten blocks, PT 06-07 … PT 15-16. A call answered outside them gets no block.
function ptBlock(iso) {
  const t = Date.parse(iso);
  if (!iso || isNaN(t)) return '';
  const h = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23'
  }).format(new Date(t)));
  if (!(h >= 6 && h <= 15)) return '';
  const p = n => String(n).padStart(2, '0');
  return 'PT ' + p(h) + '-' + p(h + 1);
}

const answered_at   = s(cd.call_answered_at_timestamp);
const transcript    = s(cd.call_transcript);
const recording_url = s(cd.call_recording_url);
const pt_block      = ptBlock(answered_at);

return { json: {
  call_id:        s(cd.call_id),
  contact_id:     s(b.contact_id || cd.contact_id),
  contact_name:   s(cd.contact_name || b.full_name || b.company_name),
  ghl_user_id:    s(cd.ghl_user_id),
  wavv_caller_id: s(cd.wavv_caller_id),
  answered_at,
  duration_sec:   Number(s(cd.call_duration_seconds)) || 0,
  recording_url,
  transcript,
  transcript_source: transcript ? 'wavv' : '',
  pt_block,
  // Tag spelling is part of the Hridoy/Mohimenul contract: 'PT 10-11' -> 'screened-pt-10-11'.
  pt_block_tag:   pt_block ? 'screened-' + pt_block.toLowerCase().replace(' ', '-') : '',
  is_pickup:      !!answered_at,
  needs_transcription: !transcript && !!recording_url,
  received_at:    new Date().toISOString()
}};
