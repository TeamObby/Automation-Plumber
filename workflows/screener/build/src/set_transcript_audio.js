// Whisper fallback result. A failed download/transcription arrives as an item with no text,
// so the transcript stays empty and the classifier answers 'unclear' instead of guessing.
return { json: {
  ...$('Normalize Call').first().json,
  transcript: String(($json && $json.text) || '').trim(),
  transcript_source: 'whisper'
}};
