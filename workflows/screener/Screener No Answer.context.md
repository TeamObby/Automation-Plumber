# Screener: No Answer  [spec §9 event 3 · §10.2 item 5]

- **n8n ID:** `aZyzUwwNdDWvaCAk` · **URL:** https://n8n.meetobby.com/workflow/aZyzUwwNdDWvaCAk · **File:** `Screener No Answer.json`
- **Folder:** `workflows/screener/` · built by `build/gen_eventhooks.js`
- **Status:** Inactive ❌ — **keep inactive until go-live**: the three GHL guards are live (2026-09-25); the switches are in
  [`docs/screener-handoff.md`](../../docs/screener-handoff.md) §3.
- **Trigger:** Webhook `POST /webhook/screener-no-answer`.

## Contract (for Hridoy)
GHL `Call No Answer`, screener branch (after its *Remove Tag* step): tag `wavv-no-answer` / `wavv-canceled` on a contact tagged `screening`. Body: the standard GHL contact payload — only `contact_id` is read.

## Flow
Webhook → Normalize → Filter: a countable event → **Screener: Attempt Counter** (`Wwx2R76IrhLMYU7K`),
which holds all the logic — see its context file.

Kept as its own workflow (not a second trigger on the counter) because the MCP's manual webhook test
always feeds the *first* webhook trigger of a workflow — found live on 2026-09-24.
