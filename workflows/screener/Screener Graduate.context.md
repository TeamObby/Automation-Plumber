# Screener: Graduate  [spec §8 · §10.2 item 6]

- **n8n ID:** `M2LD6njhVMO9Ol7w` · **URL:** https://n8n.meetobby.com/workflow/M2LD6njhVMO9Ol7w · **File:** `Screener Graduate.json`
- **Folder:** `workflows/screener/` · built by `build/gen_graduate.js` (+ `src/graduate_decide.js`, `graduate_ops.js`, `graduate_gate.js`, `graduate_log.js`); 17 nodes
- **Status:** sub-workflow — **publish before go-live** (not published yet). Called only by
  **`Screener: Graduate Sweep`** (`jZAgBUQvffv1NCMC`).
- **Data table:** `screener_graduations` `1iX0aTvMYawwyH4H` — one row per lead, upserted on every attempt (key `contact_id:screener_opp_id`).

## Purpose
The only exit from the screener into Kevin's machine. Writes into **Kevin's pipelines**, so his
automations react to what it creates (timezone followers, name routing, the Client Acquisition entry
workflow) — by design: that is the hand-off.

## Flow
When Called → **Previous graduation** (its `screener_graduations` row, for `first_failed_at`) → GHL: Get Contact → GHL: All Opps for Contact → **Graduation Plan** → *Graduate?* →
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
  `owner-confirmed` and the block tag for Kevin's lists). The tag removal always goes out (with `screening` even
  when it is already gone; GHL answers 200 for an absent tag), because Close Gate and the log run only after at
  least one write. **The contact owner is not touched** (decided 2026-09-25): Topu has normal access and nothing
  assigns leads to him, so the old "clear the screener as owner" write would only have wiped a real owner.
- **The close is gated.** `GHL: Graduation Apply` continues on error, so on its own it would still send
  the close after a failed write, and a closed opportunity is never swept again (Codex review,
  2026-09-24). So the close is its own node: **Close Gate** lets it run only if every write came back
  without an error, one result per write. Otherwise the lead stays in Owner Verified and the next sweep
  retries all of it: it reuses the Kevin opportunity it already made, and the three writes are safe to
  repeat. A row is `ok` only once the screener opportunity is closed.
- A write that fails every time (e.g. a 4xx) is retried every 10 min and stays `ok = false` in
  `screener_graduations`; the daily summary (item 7b) lists those.
- A failed create writes nothing and is logged with GHL's error.
- **`first_failed_at`** (codex review, 2026-09-25): `at` is refreshed by every retry, so a graduation failing every
  10 minutes never looked a day old. **Previous graduation** reads the row first; Log Graduation keeps the first
  failure time until the graduation succeeds (then it is cleared). The daily summary flags `ok = false` rows whose
  `first_failed_at` is older than a day. Pushed as a draft (Graduate is not published yet).

## Tested
- Offline: `tests/screener.test.js` §11 (routing, reuse incl. Manual Review excluded, guards, Close Gate,
  wiring, failed create, log). Both Codex fixes mutation-tested: putting either bug back fails the suite.
- **Live end to end, 2026-09-24** (go-ahead from Mohimenul): Dana set to Owner Verified with
  `owner-confirmed`, `screened-pt-10-11` and a leftover `wavv-none`; after the 10-min grace the sweep
  (123631) called Graduate (123632): created `Kevin Test` in **Cold Call / Day 1 Call A**
  (`rvKNBwtZPXQY1ICQLPJf`), PT 10-11 follower on it, `screening` + `wavv-none` removed (the other two
  kept), owner PUT accepted, Close Gate `close: true`, screener opp `won`, row `ok: true`. Checked in GHL
  directly, not only in the log. Kevin's automations added nothing (Dana has no TZ).
- Create response shape confirmed: `{ opportunity: { id } }`. (The owner-clearing write tested
  here was removed on 2026-09-25, see Writes.)
- Undone with the Test Rig `ungraduate` (123635): the Kevin opp is deleted (404) and Dana is back to
  open / Attempt 1 / `screening`.

## TODOs
- After the meeting of 2026-09-24: also mark the shop as graduated in **Supabase** once the tables exist.
