// Builds the classifier request. Transcripts are raw WAVV/Whisper text with NO speaker labels.
// The AI owns transcript-readable facts only (who answered); busy/quiet is the screener's (spec §4).
const MODEL = 'gpt-4.1-mini';
const MAX_CHARS = 12000;   // a screener call is ~1 min; anything longer is a mis-route or a real sales call

const SYSTEM = [
  'You label short phone calls made to plumbing businesses. A screener calls the business number with one quick question about septic pumping, then hangs up. The only thing we need to know is WHO PICKED UP. Many plumbers do not pump septic tanks, so a "no, we don\'t do that" answer is normal and says nothing about who answered.',
  '',
  'The transcript is raw speech-to-text of both sides with no speaker labels. The screener asks about septic pumping; everything else is the person who answered.',
  '',
  'call_outcome:',
  '- owner: the person who answered owns or runs the business. They say it is their company or that they run it alone, or they introduce themselves by name and then personally commit to doing a job, setting a price, or a time.',
  '- gatekeeper: someone other than the owner answered: receptionist, office staff, dispatcher, answering service, a technician or family member who takes messages, or anyone who says they must check with, or pass a message to, the owner or boss.',
  '- voicemail: a recorded greeting asking the caller to leave a message; no live person.',
  '- wrong_number: the person says this number is not this business (a personal line or a different business).',
  '- not_a_plumber: the person says the business does no plumbing work at all (an electrician, HVAC only, or closed down). Saying they do not pump septic tanks is NOT this.',
  '- do_not_call: the person asks not to be called again or to be removed.',
  '- no_conversation: the line connected but nothing meaningful was said (silence, instant hang-up, noise).',
  '- unclear: a live person answered but the transcript does not show whether they are the owner.',
  '',
  'owner_reached: "yes" only when call_outcome is owner. "no" when call_outcome is gatekeeper, voicemail, wrong_number, not_a_plumber or no_conversation. Otherwise "unclear".',
  '',
  'Rules:',
  '- Never infer ownership from tone, gender, accent or confidence.',
  '- Both owner AND gatekeeper need evidence in the words. Gatekeeper evidence is: mentioning another person who is in charge, offering to take a message or pass it on, or naming a staff role or answering service. A person who only answers with the business name and a short yes or no gives neither kind of evidence: that is unclear, not owner and not gatekeeper.',
  '- confidence (0 to 1) is how directly the transcript states the answer: 0.9 or higher when someone says it outright (they own it, they are the answering service, this is a personal number, the owner is out); 0.6 to 0.8 when it follows from clear behaviour (personally committing to a job and price); below 0.6 when you are guessing.',
  '- evidence_quote: copy the shortest phrase that supports call_outcome, character for character from the TRANSCRIPT. Never quote these instructions. Empty string if nothing supports it.',
  '- owner_name: the owner\'s first name if the transcript states it; otherwise empty string.'
].join('\n');

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['call_outcome', 'owner_reached', 'confidence', 'evidence_quote', 'owner_name'],
  properties: {
    call_outcome:   { type: 'string', enum: ['owner','gatekeeper','voicemail','wrong_number','not_a_plumber','do_not_call','no_conversation','unclear'] },
    owner_reached:  { type: 'string', enum: ['yes','no','unclear'] },
    confidence:     { type: 'number' },
    evidence_quote: { type: 'string' },
    owner_name:     { type: 'string' }
  }
};

const raw = String(($json && $json.transcript) || '').trim();
const transcript = raw.slice(0, MAX_CHARS);
const contact_name = String(($json && $json.contact_name) || '').trim();

return { json: {
  transcript, contact_name,
  truncated: raw.length > MAX_CHARS,
  // Any letter or digit, in any script: "Wrong number." is short and decisive, so no length floor.
  has_text: /[\p{L}\p{N}]/u.test(raw),
  request: {
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_schema', json_schema: { name: 'screener_verdict', strict: true, schema: SCHEMA } },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: 'Business on file: ' + (contact_name || '(unknown)') + '\n\nTranscript:\n' + transcript }
    ]
  }
}};
