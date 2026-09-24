// The event from Screener: No Answer or Screener: WAVV Disposition. Only a countable event for a
// known contact goes on; anything else ends the run.
const e = $input.first().json;
if (!e || !e.event || !e.contact_id) return [];
return [{ json: e }];
