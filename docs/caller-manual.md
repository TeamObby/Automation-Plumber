# Caller Manual — Call Dispositions

**Who this is for:** anyone making outbound calls on the plumbing campaign.
**What it covers:** every disposition you can set, what it means, when to use it, and exactly what
happens to the lead afterwards.

---

## 1. The 30-second version

After each call you set **Call Disposition**, and optionally **Call Notes**, on the contact.

1. Within a few minutes the automation reads what you set and acts on it.
2. **Your disposition always wins.** The AI reads the call transcript too, but it only decides if you
   left the disposition blank.
3. **If you set nothing**, after a 5-minute grace period the AI classifies the call on its own from
   the transcript.
4. **You can change your mind.** Edit the disposition or the note later and the automation re-runs
   and corrects itself — it replaces its earlier entry rather than adding a duplicate.
5. The disposition and notes fields are **cleared automatically** when the lead comes back around for
   its next call. An empty field next time is normal, not a lost entry.

> **Pick from the list. Never type your own wording.**
> A disposition that isn't on the list below is silently treated as **Cold Good** — the lead stays in
> the sequence as if the call went fine. See [§6 Things that quietly go wrong](#6-things-that-quietly-go-wrong).

---

## 2. Pick a disposition in three questions

**Q1 — Did a person actually pick up?**
- Machine / voicemail greeting → **Voicemail**
- Call centre or answering service, not the business → **Call Center**
- Wrong or dead number → **Bad Number**
- Nobody picked up at all → *nothing to do*, the system handles it (see [§5](#5-calls-you-dont-disposition))

**Q2 — Who did you get?**
- A **gatekeeper** (receptionist, dispatcher — not the decision-maker) → the `Gatekeeper *` family
- The **decision-maker**, and a real conversation happened → `Conversation Active`,
  `Appointment Booked`, `Sales Call`
- The **decision-maker** picked up, but **no meaningful conversation happened** → the `Cold *` family

**Q3 — Did they give you a date to call back on?**
- **Yes, a specific date/time** → use the matching **On Hold** disposition **and write the date in the
  Call Notes**. This is the only way the lead comes back automatically.
- **No, just not interested for now** → `Not Interested Right Now Good` / `Bad`
- **Never contact again** → `Do Not Contact`

---

## 3. Quick reference table

| Disposition | Use when | Opportunity moves to | Extra effects |
|---|---|---|---|
| **Cold Good** | Picked up, brief, not negative | Next cold email | Back to cold lane |
| **Cold Bad** | Rude / hostile / angry hang-up | Client Acq → Cold Bad | Flags Stop Phone Calls |
| **Cold On Hold** | Callback date given | Client Acq → Cold On Hold | Auto-returns on the date |
| **Gatekeeper Good** | Helpful gatekeeper | Next cold email | Gatekeeper lane next call |
| **Gatekeeper Bad** | Blocking / hostile gatekeeper | Client Acq → Gatekeeper Bad | Flags Stop Phone Calls, gatekeeper lane |
| **Gatekeeper On Hold** | Gatekeeper gave a callback date | Client Acq → Gatekeeper On Hold | Auto-returns, gatekeeper lane |
| **Conversation Active** | DM engaged, follow up soon | Client Acq → Conversation Active | — |
| **Conversation Active On Hold** | DM engaged, gave a date | Client Acq → Conversation Active On Hold | Auto-returns to Active Conversation cadence |
| **Appointment Booked** | Meeting agreed with date/time | Client Acq → Appointment Booked | — |
| **Sales Call** | Ready for a closing call | Client Acq → Sales Call | — |
| **Not Interested Right Now Good** | Friendly no, no date | Client Acq → Not Interested Right Now Good | Does **not** auto-return |
| **Not Interested Right Now Bad** | Negative no, not an opt-out | Client Acq → Not Interested Right Now Bad | — |
| **Do Not Contact** | Explicit opt-out | Client Acq → Do Not Contact | — |
| **Voicemail** | Answered by voicemail | Next cold email | Missed-call tag + possible Missed Call Email · **set manually** |
| **Call Center** | Answering service / call centre | Client Acq → Call Center | **Set manually** |
| **Bad Number** | Wrong or dead number | Client Acq → Bad Number | No calls or emails · **set manually** |
| **Not A Fit** | Business isn't a fit | Client Acq → Not A Fit | No calls or emails · **set manually** |

---

## 4. Full reference

### Stays in the sequence

These three keep the lead in the cold cadence. The opportunity moves to the **next cold email**,
based on which day you called:

| You called on | Next step | Then |
|---|---|---|
| Day 1 | Cold Email 2 | called again after it sends |
| Day 2 | Cold Email 3 | called again after it sends |
| Day 3 | Cold Email 4 | **end of the sequence** — no further call |

#### Cold Good
- **Meaning:** they picked up, but the call was brief — no meaningful conversation, and nothing
  negative. This is the normal outcome for most cold calls.
- **Use when:** "not interested, bye", a quick brush-off, a hang-up that wasn't hostile.
- **Opportunity moves to:** next cold email (see table above). Sequence continues.
- **Also does:** puts the lead back in the **cold** calling lane for its next call.

#### Gatekeeper Good
- **Meaning:** you reached a gatekeeper rather than the decision-maker, and they were helpful — took a
  message, said they'd pass it along, told you when to call back.
- **Use when:** receptionist/dispatcher was cooperative. It does **not** mean you got the owner.
- **Opportunity moves to:** next cold email. Sequence continues, exactly like Cold Good.
- **Also does:** flags the lead as a **gatekeeper** lead, so its next call runs in the gatekeeper
  calling lane with gatekeeper-specific scripting.

#### Voicemail
- **Meaning:** the call was answered by voicemail.
- **Use when:** you got a voicemail greeting, whether or not you left a message.
- **Opportunity moves to:** next cold email. Sequence continues.
- **Also does:** marks the last call as missed, so the next call uses a "(missed call)" variant, and
  may trigger a **Missed Call Email**:

  | Call you were making | Missed Call Email |
  |---|---|
  | Day 1 Call A · Day 2 first attempt | Missed Call Email 1 |
  | Day 2 (missed call) — i.e. the second Day 2 miss | Missed Call Email 2 |
  | Day 1 Call B · any Day 3 call | none |

- ⚠️ **The AI can never choose this one.** If you leave the field blank on a voicemail, the AI will
  call it Cold Good and no missed-call handling happens. Always set it yourself.

---

### Pauses until a date

All three require a **date in the Call Notes**. Write it however is natural — "call back next
Tuesday", "July 20 2pm", "in 2 weeks", "after the 15th, morning". The AI reads your note first and
falls back to the transcript only if the note has no usable date.

If no date can be worked out from either, the lead parks but **never comes back automatically** — so
if they gave you a date, write it down.

#### Cold On Hold
- **Meaning:** not interested right now, but asked to be contacted again on or after a later date.
- **Use when:** "call me back in the spring", "we're mid-job, try next month".
- **Opportunity moves to:** Client Acquisition → **Cold On Hold**.
- **Comes back as:** the same day's call you were making, in the **cold** lane, as a
  "(from on hold)" call. Checked every 30 minutes between 8am and 10pm PT.

#### Gatekeeper On Hold
- **Meaning:** the gatekeeper or decision-maker isn't available now and you were told when to try again.
- **Use when:** "the owner's out until Thursday", "try after the 15th".
- **Opportunity moves to:** Client Acquisition → **Gatekeeper On Hold**.
- **Comes back as:** the same day's call in the **gatekeeper** lane, as a "(from on hold)" call.
- **Also does:** flags the lead as a gatekeeper lead.

#### Conversation Active On Hold
- **Meaning:** you got a real conversation going with the decision-maker, and they asked to be picked
  up again later.
- **Use when:** engaged prospect, genuine interest, but the timing is off.
- **Opportunity moves to:** Client Acquisition → **Conversation Active On Hold**.
- **Comes back as:** the **Active Conversation** cadence at **Day 1 – 1st Attempt** — not the cold
  cadence. This is a warmer follow-up track.

---

### Leaves the sequence

These all move the opportunity into **Client Acquisition**, into the stage of the same name, and take
the lead out of cold calling.

#### Cold Bad
- **Meaning:** cold call that went badly — rude, hostile, or an angry hang-up.
- **Use when:** genuinely negative. A polite "no thanks" is **Cold Good**, not this.
- **Also does:** flags the contact **Stop Phone Calls = True**. Moving to Client Acquisition already
  takes the lead out of the calling cadence; the flag is an additional marker on the record.

#### Gatekeeper Bad
- **Meaning:** the gatekeeper was unhelpful, blocking, or hostile.
- **Use when:** "we don't take these calls", refused to pass anything on, hung up on you.
- **Also does:** flags the contact **Stop Phone Calls = True**, and flags the lead as a gatekeeper
  lead. As with Cold Bad, the move to Client Acquisition is what actually ends the calling.

#### Conversation Active
- **Meaning:** you reached the decision-maker, they're interested and engaged, and a follow-up is
  needed soon — but no specific date was agreed.
- **Use when:** real interest, warm, needs a human follow-up. If they *did* give a date, use
  **Conversation Active On Hold** instead.

#### Appointment Booked
- **Meaning:** a specific demo or meeting was agreed, with a date and time.
- **Use when:** it's actually in the calendar. "They'll think about it" is not this.

#### Sales Call
- **Meaning:** the prospect is ready to take a full sales / closing call.

#### Not Interested Right Now Good
- **Meaning:** not interested now, but the call ended on good terms and the door is open.
- **Use when:** friendly no, no callback date given.
- **Careful:** if they gave you a date, use **Cold On Hold** — this one does **not** come back
  automatically.

#### Not Interested Right Now Bad
- **Meaning:** not interested, negative and closed off — but stopping short of an explicit opt-out.

#### Do Not Contact
- **Meaning:** an explicit opt-out — "take me off your list", "do not call me again".
- **Use when:** they actually asked to be removed. This is a compliance outcome; don't use it for a
  plain "not interested".

#### Call Center
- **Meaning:** you reached a call centre or answering service rather than the business itself.
- ⚠️ **The AI can never choose this one** — only you can set it.

#### Bad Number
- **Meaning:** the number is wrong, disconnected, or belongs to someone else.
- **Note:** this lead gets no further calls **and** no further emails.
- ⚠️ **The AI can never choose this one** — only you can set it.

#### Not A Fit
- **Meaning:** the business isn't a fit for the product.
- **Note:** no further calls or emails.
- ⚠️ **The AI can never choose this one** — only you can set it.

---

## 5. Calls you don't disposition

**Nobody picked up.** The dialler records these as a system disposition ("No Answer" / "Canceled")
and a separate automation handles them — it advances the lead and sends the missed-call email where
appropriate. **You don't need to do anything**, and these never appear in the Call Disposition field.

**You forgot, or got pulled onto the next call.** After a 5-minute grace period the AI classifies the
call from the transcript on its own. It's decent at the conversational outcomes, but remember it can
**never** pick Voicemail, Call Center, Bad Number, or Not A Fit — those four are yours alone.

---

## 6. Things that quietly go wrong

**Typing your own disposition text.** Anything that isn't exactly one of the 17 above is treated as
**Cold Good** — the lead stays in the sequence as though the call went fine. There's no error and no
warning. Always pick from the list.

**Leaving a voicemail undispositioned.** The AI will call it Cold Good. The lead loses its missed-call
tag and its missed-call email, and the next call won't use the "(missed call)" script.

**Using an On Hold disposition without writing the date.** The lead parks in Client Acquisition and
sits there. On Hold without a date is a dead end — write the date in the Call Notes.

**Using Not Interested Right Now Good when they gave you a date.** It looks similar to Cold On Hold
but it does **not** bring the lead back. If there's a date, use an On Hold disposition.

**Dispositioning the wrong lead.** Because the automation acts on whichever contact you edited, a
disposition set on the wrong contact will move that contact's opportunity. Fix it by correcting both
contacts — the automation re-runs on edit and self-corrects.

---

## 7. Notes field — what it's actually used for

Call Notes is not just a comment box. It feeds two things:

1. **The callback date** for the three On Hold dispositions. Your note is read *first*, ahead of the
   call transcript, so what you write here wins.
2. **The AI's summary** of the call, which is stored on the contact and shown to whoever picks the
   lead up next.

Editing the note re-triggers the automation exactly like editing the disposition.

---

*Source of truth for this document: the `call-disposition` workflows in the automation repo. If a
disposition is added or its behaviour changes, update this manual alongside the workflow.*
