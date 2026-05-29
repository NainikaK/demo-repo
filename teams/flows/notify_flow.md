# Notify Flow — ADO Event to Teams Notification

## Overview

The notify flow covers all 15 bot-to-user notifications. Each notification is triggered
by an ADO webhook event or a recognisable comment pattern from a pipeline agent.
All notifications for a given work item are posted to that WI's dedicated Teams thread.

For the full list of ADO webhook events the bot listens to, see
[`../webhooks/ado_to_teams.md`](../webhooks/ado_to_teams.md).

---

## Notification Sequencing

The table below shows when each notification fires in the pipeline lifecycle,
in chronological order for a typical successful run.

```
Timeline ─────────────────────────────────────────────────────────────►

User submits intake
  └─► [N1] WI created

Orchestrator picks up WI
  └─► [N2] Clarification started

  Clarification score < 80 → [TEAMS_INPUT_NEEDED] posted
    └─► [N3] Clarification card sent to user (Human Input flow)

  OR Clarification score < 50 → PIPELINE_FAILED
    └─► [N4] Hard block notification

  Clarification passes (score ≥ 80 or after user response)
    └─► (no new notification; pipeline advances silently)

Story Writer completes
  └─► [N5] Stories created

Spec Agent completes
  └─► [N6] LLD produced

Frontend Agent completes
  └─► [N7] Frontend code committed

Backend Agent completes (or skips)
  └─► [N8] Backend code committed or skipped

Test Agent starts
  └─► [N9] Tests running

  Self-correction round fires
    └─► [N10] Self-correcting (repeated per round, up to 5)

Test Agent completes (all pass)
  └─► [N11] Tests passed

Audit Agent completes
  └─► [N12] Audit score posted

Score ≥ 8.0, no blocking findings:
  Supervisor merges PR
    └─► [N13] Auto-merged (Run Summary card)

Score 7.0–7.99:
  Supervisor opens draft PR
    └─► [N14] Human review required (Approval card)

Score < 7.0 or blocking findings:
  Pipeline fails
    └─► [N15] Pipeline failed (Failure/Retry card)
```

---

## All 15 Notifications — Full Specification

### N1 — Work Item Created

**Trigger:** `workitem.created` webhook  
**Format:** Plain text message  
**Thread:** Created by this event (first message in new thread)

```
WI-{id} created — "{title}"
Priority: {priority} | Type: {type}
The pipeline is starting. I'll keep you updated in this thread.

[View in ADO ↗]({ado_link})  ·  {timestamp}
```

---

### N2 — Clarification Agent Started

**Trigger:** `workitem.updated` — state changes to Active  
**Format:** Plain text message

```
Agent 1 (Clarification) is reviewing your requirements for WI-{id}.
```

---

### N3 — Clarification Needs Human Input

**Trigger:** `workitem.commented` — comment matches `[TEAMS_INPUT_NEEDED]` from clarification_agent  
**Format:** Clarification Adaptive Card  
**Note:** This notification is a card, not a text message. Full spec:
[`../bot/adaptive_cards/clarification_card.md`](../bot/adaptive_cards/clarification_card.md)

The text header in the thread before the card:
```
WI-{id} · Agent 1 needs your input before the pipeline can continue.
```

---

### N4 — Clarification Hard Blocked (Score < 50)

**Trigger:** `workitem.commented` — comment matches `[PIPELINE_FAILED]` with reason `clarification_score_too_low`  
**Format:** Plain text message with blockquote questions

```
WI-{id} — Requirements too vague to proceed.

The Clarification Agent scored your requirements {score}/100.
The pipeline requires a score of at least 80 to continue.

The agent identified these gaps:
  · {gap_1}
  · {gap_2}

The work item has been paused. Please update the requirements in ADO,
then re-tag the work item with "ai-pipeline-trigger" to restart the pipeline.

[Update requirements in ADO ↗]({ado_link})  ·  {timestamp}
```

---

### N5 — User Stories Created

**Trigger:** `workitem.commented` — comment matches `story_writer: complete`  
**Format:** Plain text message

```
WI-{id} · Agent 2 (Story Writer) created {n} user stor{y/ies} in ADO.
Each story has 4 Gherkin scenarios and Fibonacci story points.

[View stories in ADO ↗]({ado_link})  ·  {timestamp}
```

---

### N6 — Low-Level Design Produced

**Trigger:** `workitem.commented` — comment matches `spec_agent: complete`  
**Format:** Plain text message

```
WI-{id} · Agent 3 (Spec) produced the low-level design.
Frontend and backend implementation is starting.

[View LLD in ADO ↗]({ado_link})  ·  {timestamp}
```

---

### N7 — Frontend Code Written

**Trigger:** `workitem.commented` — comment matches `frontend_agent: complete`  
**Format:** Plain text message

```
WI-{id} · Agent 4 (Frontend) committed {n} file(s) to branch {branch}.
Files: {file_1}, {file_2}, ...

{timestamp}
```

---

### N8 — Backend Code Written (or Skipped)

**Trigger:** `workitem.commented` — comment matches `backend_agent: complete` or `backend_agent: skipped`  
**Format:** Plain text message

When backend changes were made:
```
WI-{id} · Agent 5 (Backend) committed {n} file(s). API contracts validated.

{timestamp}
```

When backend was skipped (no backend changes in LLD):
```
WI-{id} · No backend changes required for this work item.
Agent 5 (Backend) skipped.

{timestamp}
```

---

### N9 — Tests Running

**Trigger:** `workitem.commented` — comment matches `test_agent: running`  
**Format:** Plain text message

```
WI-{id} · Agent 6 (Test) is generating and running tests.

{timestamp}
```

---

### N10 — Tests Self-Correcting

**Trigger:** `workitem.commented` — comment matches `test_agent: correction_round`  
**Format:** Plain text message (repeated per round, up to 5 times)

```
WI-{id} · Agent 6 is fixing {n} failing test(s) — round {r}/5.

{timestamp}
```

---

### N11 — Tests Passed

**Trigger:** `workitem.commented` — comment matches `test_agent: complete`  
**Format:** Plain text message

```
WI-{id} · All tests passed.
Coverage: {pct}% on changed files | {passed} passed, {skipped} skipped.

{timestamp}
```

---

### N12 — Audit Score Posted

**Trigger:** `workitem.commented` — comment matches `audit_agent: complete`  
**Format:** Plain text message

```
WI-{id} · Audit complete.
Score: {composite}/10 · {n} finding(s)
Recommendation: {merge_recommendation}

Category scores:
  Code Correctness    {score}/10
  Test Coverage       {score}/10
  Security            {score}/10
  Standards           {score}/10
  Spec Adherence      {score}/10
  Performance         {score}/10
  Documentation       {score}/10

{timestamp}
```

If there are HIGH or CRITICAL findings, append:
```
⚠ Blocking findings:
  · [{severity}] {finding_description} ({file_path})
```

---

### N13 — Auto-Merged

**Trigger:** `git.pullrequest.merged` webhook  
**Format:** Run Summary Adaptive Card

Full spec: [`../bot/adaptive_cards/run_summary_card.md`](../bot/adaptive_cards/run_summary_card.md)

Text header before the card:
```
WI-{id} is complete. PR #{pr} was merged to main.
```

---

### N14 — Human Review Required

**Trigger:** `git.pullrequest.created` webhook where `isDraft=true`  
**Format:** Approval Adaptive Card

Full spec: [`../bot/adaptive_cards/approval_card.md`](../bot/adaptive_cards/approval_card.md)

Text header before the card:
```
WI-{id} · Audit score {score}/10. A human must review PR #{pr} before it can merge.
```

---

### N15 — Pipeline Failed

**Trigger:** Tag `PIPELINE_FAILED` added to WI (`workitem.updated` — tag change)  
**Format:** Failure/Retry Adaptive Card

Full spec: [`../bot/adaptive_cards/failure_retry_card.md`](../bot/adaptive_cards/failure_retry_card.md)

Text header before the card:
```
WI-{id} · The pipeline failed. See details below.
```

---

## Message Formatting Guidelines

### Every notification must include:

- **WI ID** in the format `WI-{id}` at the start of every message
- **Timestamp** at the end in the format `2026-05-20 14:32 UTC`
- **ADO link** where contextually relevant (work item view, PR view)

### Tone:

- Factual and brief — one or two lines per notification
- No emoji in plain text messages (emoji only in Adaptive Card UI elements if designed in)
- No filler phrases ("Great news!", "Just to let you know")
- Use past tense for completed actions ("committed", "created", "passed")
- Use present progressive for in-progress actions ("is reviewing", "is running")

### Thread vs DM:

All notifications post in the **WI thread** (the Teams channel thread created when the
WI was first seen). The bot does not send DMs unless the user has configured a
personal notification preference (future scope).

### Long file lists:

If the frontend or backend agent committed more than 5 files, the bot shows the first 5
and appends "+ {n} more — view full list in ADO."

---

## Deduplication

If two ADO events arrive that would both trigger the same notification for the same WI
within a 10-second window (e.g. a rapid state change followed by a comment), the bot
deduplicates by notification type and WI ID. Only the first is sent; the second is logged
and discarded.
