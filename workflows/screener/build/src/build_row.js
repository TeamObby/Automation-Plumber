// One row per call in screener_calls. The AI verdict is stored next to the call so the
// compare step (screener's mark vs AI) can read it back whichever arrives first (spec §4.1).
const t = $('Transcript Ready').first().json;   // one webhook = one call = one item
const v = $json;
return { json: {
  call_id: t.call_id, contact_id: t.contact_id, contact_name: t.contact_name,
  ghl_user_id: t.ghl_user_id, wavv_caller_id: t.wavv_caller_id,
  answered_at: t.answered_at, pt_block: t.pt_block, pt_block_tag: t.pt_block_tag,
  duration_sec: t.duration_sec, recording_url: t.recording_url,
  transcript: t.transcript, transcript_source: t.transcript_source,
  ai_call_outcome: v.call_outcome, ai_owner_reached: v.owner_reached,
  ai_confidence: v.confidence, ai_evidence_quote: v.evidence_quote,
  ai_quote_verified: !!v.quote_verified, ai_owner_name: v.owner_name,
  ai_model: v.model, ai_error: v.ai_error,
  // Only a clean verdict blocks a replay of this call_id; a failed one is retried (Route Replay).
  ai_ok: !v.ai_error,
  received_at: t.received_at
}};
