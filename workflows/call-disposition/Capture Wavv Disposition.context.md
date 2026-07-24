# Capture Wavv Disposition

- **n8n ID:** `zSOjEBiz3e7gbeBp` · **URL:** https://n8n.meetobby.com/workflow/zSOjEBiz3e7gbeBp
- **Folder:** call-disposition · **Status:** Active ✅ (webhook) — **not yet pushed**
- **Role:** the **WAVV → fields adapter** for the multi-update call-disposition rebuild.

## Purpose
Turns a WAVV dialer disposition **note** into the two contact custom fields that drive the rest
of the system — a small dedicated automation that parses the note, writes **Call
Disposition** + **Call Notes**, and lets that field change trigger the
[Dispatcher](./Dispatcher.context.md) (Automation 2).

## Trigger
**Webhook (WAVV Note)** — `POST /webhook/capture-wavv-disposition`. GHL fires this when a WAVV
disposition note is added; the payload carries `contact_id` and the full note text under
**`customData.note`**.

## Flow
1. **Webhook (WAVV Note)** → **Normalize** — pull `contact_id` + the raw note (`customData.note`).
2. **Parse Disposition + Note** (code) — the brain (below). **Fans out to two parallel branches:**

**Branch A — write the disposition/note fields:**
3. **IF: update fields?** — `should_update` true → write; false → **Skipped (non-WAVV / missed
   call)** (NoOp). `should_update = is_wavv && !is_missed`.
4. **GHL: Set Call Fields** (PUT contact) — writes **Call Disposition** (`YxGIrvPl5tfLeYoc7Ldr`)
   and **Call Notes** (`kVU8T6Swsh9sF4TWC81U`), even when empty. The field change is what
   **triggers the Dispatcher**.

**Branch B — strip the auto-added `wavv-` tag(s)**:
5. **Gate: WAVV note?** (Filter) — passes only WAVV notes (**any**, incl. `No Answer`/`Canceled`
   missed calls — GHL tags those too); other notes drop here.
6. **GHL: Get Contact (tags)** → **Filter wavv- Tags** (code — keeps tags starting `wavv-`,
   case-insensitive) → **Gate: has wavv- tags?** (Filter — passes only when there's ≥1) →
   **GHL: Remove wavv- Tags** (`DELETE /contacts/{id}/tags` with the collected tags).

Both gates are **Filter** nodes (single output, flow-through-if-true), so no false-branch / NoOp
nodes are needed — non-matching items simply drop.

### Why Branch B
When a WAVV disposition is set, GHL adds both a **note** *and* a same-named **tag**
(`wavv-<disposition>`, e.g. `wavv-cold-good`, `wavv-no-answer`). Those tags are noise we don't want
lingering on the contact, so this automation removes **every** `wavv-`-prefixed tag on each WAVV
note. Removing the whole set (not just this note's tag) is **idempotent and self-healing** — it also
sweeps up any `wavv-` tags left over from earlier calls. The fetch → filter → delete degrades
gracefully: a failed fetch or an empty tag list is dropped at **Gate: has wavv- tags?** (no delete
call).

## 🧩 Parsing (`Parse Disposition + Note`)
A WAVV note looks like:
```
[ WAVV: 019f71fc-83da-7bb5-b3e3-8ae0879e92fe ] To: (805) 265-3731 (363) From: (805) 572-7879 Duration: 8 seconds Disposition: Cold Good Tag: wavv-cold-good (15) Note: this is a note.
```
- **Flag** — only notes containing the `[ WAVV: <id> ]` marker are processed (`is_wavv`). Any other
  note type is ignored, so unrelated notes never touch the fields. Marker match is id-format-agnostic
  (`\[\s*WAVV:\s*[^\]]+\]`).
- **Missed-call skip** (`is_missed`) — this automation is **not** missed-call
  aware on its own, so a WAVV disposition whose text contains **`No Answer`** or **`Canceled`**
  (regex `/(no[\s-]*answer|cancell?ed)/i` on the `Disposition:` text) is treated as a missed call
  and the field write is **skipped** entirely — that lead belongs to the dedicated
  [`missed-call`](../missed-call/Cold%20Handler.context.md) automation, not this disposition path.
  (`Voicemail` is **not** a miss — it's a real disposition and still writes, routing to the Cold
  Handler's voicemail branch.)
- **Disposition** — text between `Disposition:` and `Tag:` (Tag always follows a present
  Disposition). Slugified (`Cold Good` → `cold-good`) and **kept only if it's in the KNOWN list**
  (the 17 slugs the Cold Handler routes — incl. `voicemail` → email drip + `last_call_missed` tag,
  and `call-center` / `bad-number` / `not-a-fit` → Client Acquisition, no call/email sequence);
  otherwise **empty**.
- **Note** — text after `Note:` to end. **Empty** if absent **or** the literal `Auto-disposition`;
  otherwise kept as-is.

Both are written regardless of whether they came out empty — an empty write still (re)triggers the
Dispatcher, whose gate then decides what to do.

## GHL custom field IDs
- **Call Disposition** `YxGIrvPl5tfLeYoc7Ldr` — written (slug, e.g. `cold-good`, or `''`)
- **Call Notes** `kVU8T6Swsh9sF4TWC81U` — written (note text or `''`)
- **Tags** (not a custom field) — Branch B removes any tag matching `wavv-*`
  (`DELETE /contacts/{id}/tags`).

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv`. Set Call Fields (PUT), Get Contact (GET),
  Remove wavv- Tags (DELETE) — the two writes have `retryOnFail`, 4 tries, 2s; the tag steps also
  `onError: continueRegularOutput` so a cleanup hiccup never blocks Branch A.

## How it fits the rebuild
```
GHL WAVV-note webhook → Capture Wavv Disposition → writes Call Disposition + Call Notes
   → GHL field-change webhook → Dispatcher (Automation 2) → Cold Handler (Automation 3)
```
This is a **separate input path** from [`Capture Call Record`](./Capture%20Call%20Record.context.md) (which handles the
call-recorded event: transcript + stored context). Both ultimately feed the Dispatcher via the
same two fields.

## TODOs / gotchas
- **Non-WAVV notes and missed calls are skipped** (the `IF: update fields?` gate) so they can't
  clear the fields. If you ever want every note to write, widen/drop that gate.
- **Tag cleanup (Branch B) runs for missed calls too** (gated on `is_wavv`, not `should_update`) —
  a `No Answer`/`Canceled` note still gets its `wavv-` tag stripped even though its fields are
  skipped. It removes **all** `wavv-`-prefixed tags, so it's safe to re-run.
- Disposition is stored **slugified** (`cold-good`), which the Dispatcher/Cold Handler slugify
  again idempotently — safe either way.
- Depends on the GHL side sending the note under `customData.note`; `Normalize` also accepts a
  top-level `note`.
- ⚠️ Cutover: this writes the same fields the Dispatcher listens on. It only does anything
  end-to-end once the Dispatcher (+ Cold Handler) are activated.

## Related
- Downstream: [`Dispatcher`](./Dispatcher.context.md) (Automation 2, `SfI5Hx6mlc4Qh3D1`) →
  [`Cold Handler`](./Cold%20Handler.context.md) (Automation 3).
- Sibling input path: [`Capture Call Record`](./Capture%20Call%20Record.context.md) (call-recorded).
- Custom fields, known dispositions: [`AGENTS.md`](../../AGENTS.md).
