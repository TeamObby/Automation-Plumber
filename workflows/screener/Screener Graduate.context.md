# Screener: Graduate  [spec §8 · §10.2 item 6]

- **n8n ID:** `M2LD6njhVMO9Ol7w` · **URL:** https://n8n.meetobby.com/workflow/M2LD6njhVMO9Ol7w · **File:** `Screener Graduate.json`
- **Folder:** `workflows/screener/` · built by `build/gen_graduate.js` (+ `src/graduate_decide.js`, `graduate_ops.js`, `graduate_log.js`)
- **Status:** sub-workflow — **publish before go-live** (not published yet). Called only by
  **`Screener: Graduate Sweep`** (`jZAgBUQvffv1NCMC`).
- **Data table:** `screener_graduations` `1iX0aTvMYawwyH4H` — one row per attempt (key `contact_id:screener_opp_id`).

## Purpose
The only exit from the screener into Kevin's machine. Writes into **Kevin's pipelines**, so his
automations react to what it creates (timezone followers, name routing, the Client Acquisition entry
workflow) — by design: that is the hand-off.

## Flow
When Called → GHL: Get Contact → GHL: All Opps for Contact → **Graduation Plan** → *Graduate?* →
*New Kevin opp needed?* → (GHL: Create Kevin Opp) → **Graduation Ops** → *Kevin opp exists?* →
GHL: Graduation Apply → **Log Graduation** → Store.

## Rules
- **Guards:** the contact must carry `owner-confirmed` and the screener opportunity must still be open
  in **Owner Verified** (a screener correction since the sweep picked it → skip).
- **Kevin's opportunity** follows today's `Import Contact To New` rule: **email → Client Acquisition /
  New**, **no email → Cold Outbound Call / Day 1 Call A**. Named after the company.
- **Re-screen trap / retries:** if the contact already has an **open** opportunity in any non-screener
  pipeline, it is **reused** — nothing new is created.
- **Writes, in order:** PT block follower on Kevin's opportunity → remove `screening` + any `wavv-*`
  tags (keeps `owner-confirmed` and the block tag for Kevin's lists) → clear the screener as the
  contact's owner → **close the screener opportunity (`won`) last**. Any failure before the close
  leaves the lead in Owner Verified, so the next sweep retries it and finds the opportunity it already
  made.
- A failed create writes nothing and is logged with GHL's error.

## Tested
- Offline: `tests/screener.test.js` §11 (routing, reuse, guards, order, failed create, log).
- Live: not yet end to end — graduating the test contact creates a real opportunity in Kevin's pipeline,
  which his automations act on, so it needs a go-ahead and a cleanup plan (delete the created opp).
  Unverified until then: `assignedTo: null` clearing the owner, and the create response shape.

## TODOs
- After the meeting of 2026-09-24: also mark the shop as graduated in **Supabase** once the tables exist.
