// The part of the stored row the compare step needs, written to the contact's Screen AI Verdict
// field so it can meet the screener's mark whenever that arrives (spec §4.1). $json is a
// screener_calls row: fresh from Store, or the stored one on a write-back retry (Route Replay).
const r = $json;
return { json: {
  call_id: r.call_id,
  contact_id: r.contact_id,
  verdict_json: JSON.stringify({
    call_id: r.call_id, answered_at: r.answered_at, pt_block: r.pt_block, pt_block_tag: r.pt_block_tag,
    ghl_user_id: r.ghl_user_id, call_outcome: r.ai_call_outcome, owner_reached: r.ai_owner_reached,
    confidence: r.ai_confidence, quote_verified: r.ai_quote_verified, evidence_quote: r.ai_evidence_quote,
    owner_name: r.ai_owner_name, model: r.ai_model, ai_error: r.ai_error
  })
}};
