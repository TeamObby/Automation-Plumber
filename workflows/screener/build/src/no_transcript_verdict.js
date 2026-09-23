// Nothing to classify (empty or near-empty transcript). On an answered call that usually means
// transcription failed, not that nobody spoke — so answer 'unclear' without calling the model.
return { json: {
  call_outcome: 'unclear', owner_reached: 'unclear', confidence: 0,
  evidence_quote: '', quote_verified: false, owner_name: '',
  model: '', truncated: false, ai_error: 'no transcript'
}};
