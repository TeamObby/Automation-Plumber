# Create Manual Review Opp

- **n8n ID:** _pending import_ · **File:** `Create Manual Review Opp.json`
- **Folder:** `workflows/manual-review/`
- **Status:** inactive (not yet imported)
- **Trigger:** Webhook (POST `/webhook/manual-review-opp`), called by a GHL workflow.

## Purpose
When a caller writes into the **Manual Review Items** contact field (`tYhhupx5TalZqdNsiwCs`),
create/ensure exactly **one** opportunity for that lead in the **Manual Review Needed**
pipeline → **Pending Review** stage, so a human can action it after the call.

## GHL side (configure in GHL, not in this file)
- Trigger: fire when **Manual Review Items** is **updated and not empty**.
  (If GHL lacks a per-field-change trigger, use a contact-update trigger filtered to
  "Manual Review Items is not empty" — re-fires are safe because n8n dedupes.)
- Action: **Custom Webhook** → `https://n8n.meetobby.com/webhook/manual-review-opp`,
  sending at least **`contact_id`** in the body/customData.

## n8n flow
1. **Webhook (Manual Review)** → **Normalize** — extract `contact_id`.
2. **GHL: Get Contact** → **Check Review Field** — read Manual Review Items + build opp name;
   `has_review` guard.
3. **Filter: has review items** — defensive; stop if the field is empty.
4. **GHL: Fetch Manual-Review Opps** — `/opportunities/search` by `contact_id` +
   `pipeline_id=OOu5TjgalfGZElEIoSbq`.
5. **Plan Dedup** — `exists?` keep the first opp, mark extras for deletion.
6. **IF: opp exists?**
   - **false** → **GHL: Create Opp** (POST `/opportunities/`) in Pending Review.
   - **true** → **GHL: Update Opp → Pending Review** (PUT, re-opens/keeps id) →
     **Extras to delete** → **GHL: Delete Extra Opp** (removes duplicates).

## Dedupe rule (only one opp per lead)
- 0 existing → create one. ≥1 → update the first to **Pending Review**, delete the rest.
- Re-firing is idempotent (an existing opp is just re-set to Pending Review).
- New review items on a `Review Done` opp → moved back to **Pending Review**.

## Target (from AGENTS.md)
- Pipeline **Manual Review Needed** `OOu5TjgalfGZElEIoSbq` ·
  Stage **Pending Review** `d800d3ec-5263-42e7-b383-f66e5e187bed`
  (Review Done `a19eaf0b-7ea1-4b4f-8469-c8b13d828d8a` — set manually by the reviewer).

## Credentials
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` (Waterline Growth) · location `rzaMhqeo2apNI1p6DG5z`

## ⚠️ Assumptions to verify on import
- **GHL create-opportunity** = `POST /opportunities/` with
  `{pipelineId, locationId, pipelineStageId, contactId, name, status:'open'}`. Verify the body shape.
- **GHL webhook** sends `contact_id` (mapped in the GHL Custom Webhook action).
- **Opp name** = contact name; **re-open** to Pending Review on new items (both configurable).

## Related
- Field + pipeline reference: [`AGENTS.md`](../../AGENTS.md).
- Opp search/pagination pattern reference: **Send Cold Email 2/3/4** (`0iXr4fHGqptYGJpg`).
