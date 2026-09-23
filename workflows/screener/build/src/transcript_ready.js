// Fan-in point: WAVV transcript (IF false branch) or the Whisper fallback (true branch).
const n = $('Normalize Call').first().json;
return { json: {
  ...n,
  transcript: String(($json && $json.transcript) || '').trim(),
  transcript_source: String(($json && $json.transcript_source) || n.transcript_source || '')
}};
