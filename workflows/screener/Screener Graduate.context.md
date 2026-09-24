# Screener: Graduate  [spec §8 · §10.2 item 6]

- **n8n ID:** `M2LD6njhVMO9Ol7w` · **URL:** https://n8n.meetobby.com/workflow/M2LD6njhVMO9Ol7w · **File:** `Screener Graduate.json`
- **Folder:** `workflows/screener/` · built by `build/gen_graduate.js` (+ `src/graduate_decide.js`, `graduate_ops.js`, `graduate_gate.js`, `graduate_log.js`)
- **Status:** sub-workflow — **publish before go-live** (not published yet). Called only by
  **`Screener: Graduate Sweep`** (`jZAgBUQvffv1NCMC`).
- **Data table:** `screener_graduations` `1iX0aTvMYawwyH4H` — one row per lead, upserted on every attempt (key `contact_id:screener_opp_id`).

## Purpose
The only exit from the screener into Kevin's machine. Writes into **Kevin's pipelines**, so his
automations react to what it creates (timezone followers, name routing, the Client Acquisition entry
workflow) — by design: that is the hand-off.

## Flow
When Called → GHL: Get Contact → GHL: All Opps for Contact → **Graduation Plan** → *Graduate?* →
*New Kevin opp needed?* → (GHL: Create Kevin Opp) → **Graduation Ops** → *Kevin opp exists?* →
GHL: Graduation Apply → **Close Gate** → *All writes OK?* → (GHL: Close Screener Opp) → **Log Graduation** → Store.

## Rules
- **Guards:** the contact must carry `owner-confirmed` and the screener opportunity must still be open
  in **Owner Verified** (a screener correction since the sweep picked it → skip).
- **Kevin's opportunity** follows today's `Import Contact To New` rule: **email → Client Acquisition /
  New**, **no email → Cold Outbound Call / Day 1 Call A**. Named after the company.
- **Re-screen trap / retries:** if the contact already has an **open** opportunity in one of **Kevin's
  campaign pipelines** (Client Acquisition, Cold Email, Cold Call, Gatekeeper, Active Conversation,
  Rebooking), it is **reused** — nothing new is created. Opportunities in any other pipeline (e.g. the
  AI-receptionist demo pipelines on the test contact) are ignored: reusing one would strand the lead
  outside Kevin's machine (found in self-review, 2026-09-24). **Manual Review Needed is not a handoff**:
  it is a task for a human, not a sales or call queue, so a lead whose only open opportunity is there
  still gets a real one (Codex review, 2026-09-24).
- **Writes:** PT block follower on Kevin's opportunity → remove `screening` + any `wavv-*` tags (keeps
  `owner-confirmed` and the block tag for Kevin's lists) → clear the screener as the contact's owner.
- **The close is gated.** `GHL: Graduation Apply` continues on error, so on its own it would still send
  the close after a failed write, and a closed opportunity is never swept again (Codex review,
  2026-09-24). So the close is its own node: **Close Gate** lets it run only if every write came back
  without an error, one result per write. Otherwise the lead stays in Owner Verified and the next sweep
  retries all of it: it reuses the Kevin opportunity it already made, and the three writes are safe to
  repeat. A row is `ok` only once the screener opportunity is closed.
- A write that fails every time (e.g. a 4xx) is retried every 10 min and stays `ok = false` in
  `screener_graduations`; the daily summary (item 7b) lists those.
- A failed create writes nothing and is logged with GHL's error.

## Tested
- Offline: `tests/screener.test.js` §11 (routing, reuse incl. Manual Review excluded, guards, Close Gate,
  wiring, failed create, log). Both Codex fixes mutation-tested: putting either bug back fails the suite.
- Live: not yet end to end — graduating the test contact creates a real opportunity in Kevin's pipeline,
  which his automations act on, so it needs a go-ahead and a cleanup plan (delete the created opp).
  Unverified until then: `assignedTo: null` clearing the owner, and the create response shape.

## TODOs
- After the meeting of 2026-09-24: also mark the shop as graduated in **Supabase** once the tables exist.
