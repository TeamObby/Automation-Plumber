// Validate the model's verdict. The response format is a strict JSON schema, so this only
// catches transport failures and logically inconsistent answers — never trust, always check.
const OUTCOMES = ['owner','gatekeeper','voicemail','wrong_number','not_a_plumber','do_not_call','no_conversation','unclear'];
const REACHED  = ['yes','no','unclear'];
const prep = $('Prep Transcript').item.json;
const MODEL = (prep.request && prep.request.model) || '';

let v = null, ai_error = '';
try { v = JSON.parse($json.choices[0].message.content); }
catch (e) { ai_error = ($json && $json.error && ($json.error.message || JSON.stringify($json.error))) || 'unparseable model response'; }

const fallback = { call_outcome: 'unclear', owner_reached: 'unclear', confidence: 0, evidence_quote: '', owner_name: '' };
if (!v || typeof v !== 'object') v = fallback;

let call_outcome  = OUTCOMES.includes(v.call_outcome)  ? v.call_outcome  : 'unclear';
let owner_reached = REACHED.includes(v.owner_reached)  ? v.owner_reached : 'unclear';
let confidence    = Number(v.confidence);
confidence = isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;

// The two fields must agree. If they don't, the model was not sure — say so.
if (call_outcome === 'owner' && owner_reached !== 'yes') owner_reached = 'unclear';
if (owner_reached === 'yes' && call_outcome !== 'owner') owner_reached = 'unclear';

// A quote that is not in the transcript is a hallucination; keep it, but flag it.
// Unicode-aware: keep letters, combining marks (Bengali/Hindi vowel signs change the word) and
// digits. A quote that normalizes to nothing ("...", "-") verifies nothing.
const norm = x => String(x || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
// Whole-word match where the script separates words with spaces ("own" must not match "owned");
// Chinese/Japanese/Thai-family scripts have no spaces, so any substring is a valid excerpt there.
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
function quoteIn(text, q) {
  if (!q) return false;
  for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + 1)) {
    const end = i + q.length;
    const leftOk  = i === 0 || text[i - 1] === ' ' || UNSPACED.test(q[0]) || UNSPACED.test(text[i - 1]);
    const rightOk = end === text.length || text[end] === ' ' || UNSPACED.test(q[q.length - 1]) || UNSPACED.test(text[end]);
    if (leftOk && rightOk) return true;
  }
  return false;
}
const evidence_quote = String(v.evidence_quote || '').trim();
const quote_verified = quoteIn(norm(prep.transcript), norm(evidence_quote));

return { json: {
  call_outcome, owner_reached, confidence,
  evidence_quote, quote_verified,
  owner_name: String(v.owner_name || '').trim(),
  model: MODEL, truncated: !!prep.truncated, ai_error
}};
