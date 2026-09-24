# Screener: WAVV Disposition  [spec §9 event 4 · §10.2 item 5]

- **n8n ID:** `QOYHMP5ZGQcnG3ED` · **URL:** https://n8n.meetobby.com/workflow/QOYHMP5ZGQcnG3ED · **File:** `Screener WAVV Disposition.json`
- **Folder:** `workflows/screener/` · built by `build/gen_eventhooks.js`
- **Status:** Inactive ❌ — **keep inactive until the four GHL guard branches exist.**
- **Trigger:** Webhook `POST /webhook/screener-disposition`.

## Contract (for Hridoy)
GHL `Capture Wavv Disposition`, screener branch (Branch A only — Branch B tag cleanup still runs for everyone): the WAVV note in `customData.note` (same payload the live workflow already sends). Only `Voicemail` and `Bad Number` are acted on.

## Flow
Webhook → Normalize → Filter: a countable event → **Screener: Attempt Counter** (`Wwx2R76IrhLMYU7K`),
which holds all the logic — see its context file.

Kept as its own workflow (not a second trigger on the counter) because the MCP's manual webhook test
always feeds the *first* webhook trigger of a workflow — found live on 2026-09-24.
