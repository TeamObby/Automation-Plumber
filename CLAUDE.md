# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read [`AGENTS.md`](AGENTS.md) first.** It is the master context: the n8n instance, the workflow
Registry (name · ID · URL), every GHL pipeline/stage/custom-field ID, and the open questions.
This file only adds what AGENTS.md does not: commands, how the pieces fit, and tool gotchas.

## What this repo is (and is not)
There is no application to build. The system runs in **n8n** (`https://n8n.meetobby.com`) and
**GoHighLevel**; this repo is a **mirror + documentation** of it:
- `workflows/<area>/<Name>.json` — snapshot of a live n8n workflow (Instantly bearer tokens redacted).
- `workflows/<area>/<Name>.context.md` — intent, flow, gotchas, sync state. Keep it updated in the
  **same commit** as its `.json`.
- `docs/ghl-automations.md` — the only record of the GHL side (which GHL workflow fires which n8n webhook).
- `docs/screener-system-plan.md` — build spec for the screener system (work split Hridoy = GHL/WAVV, Mohimenul = n8n/AI).
- `metrics/metrics-sheet-setup.gs` — Apps Script that builds the "Plumber Campaign Metrics" sheet.
- `supabase/*.sql` — Supabase table definitions (run once in the project's SQL editor); the screener's
  project URL + n8n credential are in `workflows/screener/build/supabase.json` (`build.sh` warns while empty).

## Commands
```bash
node tests/metrics-logging.test.js   # handlers' code nodes → exact Sheets rows vs the .gs contract
node tests/screener.test.js          # screener code nodes: PT hour block, normalize, verdict guards, dedupe
python3 docs/md-to-docx.py docs/caller-manual.md   # manual → .docx (no deps; handles only our Markdown subset)
workflows/screener/build/build.sh    # screener: src/*.js → out/*.sdk.js (MCP code) + ../*.json snapshots
```
No app build, lint, or package manager (`build.sh` only generates screener workflow code). Tests are plain Node scripts with no framework; there is no
single-test flag — each file is one suite, and failures print `✗ FAIL: <message>`. The metrics test
optionally uses `luxon` (`npm i luxon`) and otherwise falls back to a built-in shim.

**How the tests work:** they pull `jsCode` out of the workflow JSON by node name, run it with
`new Function('$json', '$', code)`, and mock `$('Node Name')`. So a renamed node or a changed
output field breaks a test. Run the matching suite after any edit to a workflow JSON.

## Architecture (the big picture)
- **Everything is event-driven from GHL.** GHL workflows (WAVV call recorded, disposition note added,
  tag `wavv-no-answer`, field changed) POST to n8n webhooks. n8n reads and writes GHL over REST
  (`services.leadconnectorhq.com`, credential `httpMultipleHeadersAuth`) and Instantly over REST.
- **State lives on the GHL contact**, in custom fields (Call Router Context, Call Processing State,
  Stop Emails, Email Step Name, …) and tags (`gatekeeper`, `last_call_missed`). Many workflows are
  chained **only** through a field write that triggers the next GHL workflow. Grep AGENTS.md for a
  field's ID before changing who writes it.
- **Dispatcher → handler pattern.** A dispatcher picks the route (rebooking > conversation > cold >
  gatekeeper) and calls a sub-workflow handler. Cold and Gatekeeper handlers are **near-copies**:
  a change to one almost always has to go into its twin (call-disposition *and* missed-call).
- **The opportunity's stage is the queue.** A stage means "the call/email that is due next".
  Nightly schedulers (3:00 / 3:30 / 4:00 / 4:30 AM) move opps between the email and call
  pipelines; `Email Sent → Move To Sent Stage` is the load-bearing hinge of the email path.
- **Screener** (`workflows/screener/`) is separate on purpose. It writes GHL only for contacts tagged
  `screening` (stage, tags, followers in its own pipeline); `Screener: Graduate` is the one piece that
  creates opportunities in Kevin's pipelines. Its own state lives in n8n data tables (`screener_calls`,
  `screener_attempts`, `screener_graduations`); after the 2026-09-24 meeting, Supabase becomes the source
  of truth and the screener will write there too.
  Keep the entry workflows inactive until the GHL guards exist: `Capture Call`, `Mark + Compare`,
  `No Answer`, `WAVV Disposition`, `Write-back Retry`, `Graduate Sweep`. Sub-workflows published
  2026-09-24: Classify Transcript, Compare Step, Attempt Counter; `Graduate` still to publish.
  `Screener: Test Rig` (manual only) plays the screener on the test contact Dana Happy and resets her;
  `ungraduate` undoes a Graduate test (deletes the Kevin opportunity Graduate logged for her).
  GHL never re-sends a webhook, so recovery is the retry sweep reading `writeback_ok = false` rows.

## Working on live workflows (n8n MCP)
- Build/edit with the MCP's SDK flow: `get_sdk_reference` → `get_node_types` → `validate_workflow` →
  `create_workflow_from_code` / `update_workflow`. **Live edits are real**; the campaign runs on
  these. Confirm before pushing anything that changes Kevin's campaign workflows.
- After a push, **re-pull and diff** before trusting it. Known MCP behaviour:
  - `get_workflow_details` never returns credentials; the "credentials skipped during
    auto-assignment" note is expected, and a real execution is the only proof they are set.
  - A data-table filter with `condition: 'isTrue'` was silently saved without its condition.
    Use `condition: 'eq', keyValue: '={{ true }}'`.
  - `maxTries` / `waitBetweenTries` are dropped on save (n8n defaults apply).
  - **An unpublished sub-workflow only runs under a *manual* top-level execution.** A sub-workflow
    calling another, or any call from an active workflow, fails with "Workflow is not active". Publish
    every screener sub-workflow before go-live, and re-publish after each `update_workflow`
    (publishing snapshots the current draft). `publish_workflow` is a production action — ask first.
  - `execute_workflow` with a webhook input always feeds the workflow's **first** webhook trigger:
    one webhook per workflow if it must be testable.
  - GHL `GET /opportunities/search` lags writes by seconds; `GET /contacts/{id}` does not. Never
    skip an opportunity write because search says it is already done.
  - An apostrophe in a top-level `//` comment of the SDK code (e.g. `contact's`) breaks the MCP
    parser for everything after it ("Unterminated string constant" at a later line). Keep
    apostrophes out of generator-level comments; inside `jsCode` strings they are fine.
  - Large tool results are saved to disk under the session's `tool-results/` folder; read them
    with `jq` instead of paging.
- **Don't run `update_workflow` and `execute_workflow` in parallel.** The execution can race the
  update and run the old version.
- Test a webhook workflow with `execute_workflow` in `manual` mode and a `webhook` input whose
  body copies the real GHL payload. Test data table rows can't be deleted via the MCP, so mark
  them `TEST-…` and list them in the context file.
- **Screener workflows are built from source, not edited in n8n.** The source of truth is
  `workflows/screener/build/src/*.js` (one file per code node; the prompt and schema live in
  `prep_transcript.js`) plus `gen_*.js` (node wiring); workflow IDs live in `build/ids.json`. To change one:
  edit `src/` → `build.sh` → `node tests/screener.test.js` → paste `build/out/<name>.sdk.js` into
  `validate_workflow` then `update_workflow` → re-run the eval / a manual webhook test.
  `build.sh` also rewrites `workflows/screener/*.json`, so the snapshot always equals what was
  pushed; the snapshots carry no node IDs. The eval fixtures are inlined in `src/load_fixtures.js`;
  keep them equal to `tests/fixtures/screener-transcripts.json` (the test enforces it).
- Classifier prompt or `Parse Verdict` changes: re-run `Screener: Classifier Eval` (`FMUXvDBXsigHA4vb`) and require
  `passed: true` (8/8 stable and correct across 3 runs).
