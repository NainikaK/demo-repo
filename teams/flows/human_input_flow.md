# Human Input Flow — [TEAMS_INPUT_NEEDED] → Adaptive Card → ADO Response

## Overview

This flow handles the case where a pipeline agent cannot proceed without a human
decision. The agent posts a structured `[TEAMS_INPUT_NEEDED]` comment to the ADO work
item. The Teams bot detects this comment, sends the appropriate Adaptive Card to the
user, and posts the user's response back to ADO as a new comment. The pipeline agent's
polling loop detects the response and resumes.

No agent is modified to be aware of Teams. The contract is purely ADO comments.

Full comment format spec: [`../hooks/input_needed_contract.md`](../hooks/input_needed_contract.md)

---

## Full Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1 — Agent Posts [TEAMS_INPUT_NEEDED] to ADO                  │
│                                                                     │
│ A pipeline agent (e.g. Clarification Agent, score 50–79) cannot     │
│ proceed without human input.                                        │
│                                                                     │
│ Agent posts to ADO WI-542:                                          │
│   [TEAMS_INPUT_NEEDED]: {                                           │
│     "question": "Where should the toggle be placed?",              │
│     "context": "The requirement does not specify UI placement.",    │
│     "options": ["Navbar", "Settings page", "Both"],                │
│     "wi_id": "WI-542",                                             │
│     "agent": "clarification_agent"                                 │
│   }                                                                 │
│                                                                     │
│ Agent then pauses. The orchestrator polls ADO every 60 s for        │
│ a [TEAMS_INPUT_RESPONSE] comment before resuming the agent.         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ ADO fires workitem.commented webhook
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2 — Bot Receives Webhook                                      │
│                                                                     │
│ Bot receives: workitem.commented event for WI-542.                  │
│                                                                     │
│ Bot reads comment body.                                             │
│ Bot checks: Does comment start with "[TEAMS_INPUT_NEEDED]: "?       │
│   YES → enter Human Input flow                                      │
│   NO  → standard comment handling (see ado_to_teams.md Event 3)    │
│                                                                     │
│ Bot checks: Was comment posted by a pipeline service account?       │
│   YES → continue                                                    │
│   NO  → ignore (prevent loops if a human accidentally types prefix) │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3 — Parse and Validate JSON Payload                           │
│                                                                     │
│ Bot strips the "[TEAMS_INPUT_NEEDED]: " prefix.                     │
│ Bot parses the remaining string as JSON.                            │
│                                                                     │
│ Validation checks:                                                  │
│ 1. Valid JSON (parseable)                                           │
│ 2. Required fields present: question, context, options, wi_id, agent│
│ 3. wi_id matches the work item ID in the webhook payload            │
│ 4. options is null or an array of 2–4 strings                       │
│ 5. question ends with "?"                                           │
│                                                                     │
│ On validation failure:                                              │
│   Bot posts to the WI thread: "An agent posted a malformed input    │
│   request. The pipeline may be stalled — please check ADO directly."│
│   Bot logs the raw comment body and exits the flow.                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4 — Route to Correct Teams Thread                             │
│                                                                     │
│ Bot looks up wi_id → teams_thread_id in bot state store.            │
│                                                                     │
│ If thread found:                                                    │
│   Post Clarification card to that thread.                           │
│                                                                     │
│ If no thread found (WI not created through Teams):                  │
│   Bot creates a new thread in the default pipeline channel.         │
│   Posts header: "Pipeline update for WI-{id} — input needed."      │
│   Stores new wi_id → thread_id mapping.                             │
│   Then posts Clarification card to the new thread.                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5 — Send Clarification Adaptive Card                          │
│                                                                     │
│ Bot determines card variant based on options field:                 │
│                                                                     │
│ Variant A — Options provided (options is non-null array):           │
│   ┌─────────────────────────────────────────────────────┐          │
│   │  Agent Input Required — WI-542                      │          │
│   │  Clarification Agent                                │          │
│   ├─────────────────────────────────────────────────────┤          │
│   │  Where should the toggle be placed?                 │          │
│   │                                                     │          │
│   │  Context: The requirement does not specify UI       │          │
│   │  placement.                                         │          │
│   ├─────────────────────────────────────────────────────┤          │
│   │  [ Navbar ] [ Settings page ] [ Both ]              │          │
│   └─────────────────────────────────────────────────────┘          │
│                                                                     │
│ Variant B — Free text (options is null):                            │
│   ┌─────────────────────────────────────────────────────┐          │
│   │  Agent Input Required — WI-542                      │          │
│   │  Clarification Agent                                │          │
│   ├─────────────────────────────────────────────────────┤          │
│   │  What should the default theme be on first visit?   │          │
│   │                                                     │          │
│   │  Context: The criteria specify persistence but not  │          │
│   │  the initial default.                               │          │
│   ├─────────────────────────────────────────────────────┤          │
│   │  [Your answer...                               ]    │          │
│   │  [ Submit ]                                         │          │
│   └─────────────────────────────────────────────────────┘          │
│                                                                     │
│ Both variants display agent name and WI ID in the card header.      │
│ Bot records: pending_input for WI-542, started_at timestamp.        │
│ Bot starts 24-hour timeout timer.                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ User interacts with card
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 6 — User Responds                                             │
│                                                                     │
│ Variant A (option selected):                                        │
│   User clicks "Navbar".                                             │
│   Card collapses to: "You selected: Navbar ✓"                       │
│   answer = "Navbar"                                                 │
│                                                                     │
│ Variant B (free text submitted):                                    │
│   User types: "Default to light mode for new users"                │
│   User clicks Submit.                                               │
│   Card collapses to: "Response submitted ✓"                         │
│   answer = "Default to light mode for new users"                   │
│                                                                     │
│ In both cases:                                                      │
│   Bot captures: answer, teams_user_display_name, response timestamp │
│   Bot clears the pending_input record and cancels timeout timer.    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 7 — Bot Posts Response to ADO                                 │
│                                                                     │
│ Bot posts a new comment to ADO WI-542:                              │
│                                                                     │
│   [TEAMS_INPUT_RESPONSE]: {                                         │
│     "answer": "Navbar",                                             │
│     "wi_id": "WI-542",                                             │
│     "agent": "clarification_agent",                                 │
│     "responded_by": "Jane Smith",                                   │
│     "responded_at": "2026-05-20T14:32:00Z"                         │
│   }                                                                 │
│                                                                     │
│ Bot posts in the Teams thread:                                      │
│   "Your response has been sent to the pipeline. The agent           │
│    will resume shortly."                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Orchestrator polls ADO; detects new comment
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 8 — Pipeline Resumes                                          │
│                                                                     │
│ The orchestrator's polling loop (every 60 s) reads the new comment. │
│ It detects [TEAMS_INPUT_RESPONSE] following the [TEAMS_INPUT_NEEDED]│
│ comment.                                                            │
│                                                                     │
│ The relevant agent is re-invoked with the answer appended to its    │
│ context:                                                            │
│   "User clarified: 'Navbar'"                                        │
│                                                                     │
│ Pipeline continues from where it paused.                            │
│                                                                     │
│ Bot receives subsequent pipeline events via normal Notify flow.     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Identifying the Correct Thread

The bot uses the `wi_id` field in the `[TEAMS_INPUT_NEEDED]` JSON payload to look up
the Teams thread. The state store entry for each WI contains:

```json
{
  "wi_id": "WI-542",
  "teams_thread_id": "19:abc123@thread.v2",
  "teams_channel_id": "19:xyz789@thread.v2",
  "created_by_teams_user": "jane.smith@example.com",
  "created_at": "2026-05-20T14:00:00Z",
  "status": "active"
}
```

If multiple users are watching a WI, the Clarification card is posted to the shared
thread. All users in that thread see the card. The first user to respond wins; the card
then shows "Responded by {name}" and further submissions are ignored.

---

## Timeout Handling

| Time elapsed | Bot action |
|-------------|-----------|
| 24 hours with no response | Bot sends reminder in thread: "The pipeline is waiting for your response. [See the question]" |
| 48 hours with no response | Bot posts `[TEAMS_INPUT_TIMEOUT]` comment to ADO (see contract spec); orchestrator marks WI as PIPELINE_FAILED |
| After timeout ADO comment | Bot posts in thread: "The pipeline timed out waiting for a response. WI-{id} has been marked as failed. You can retry by clicking Retry on the failure card." |

The timeout window is configurable via environment variable `TEAMS_INPUT_TIMEOUT_HOURS`
(default: 48). The reminder fires at 50% of the timeout window.

---

## Multiple Pending Questions

In rare cases, two agents could both post `[TEAMS_INPUT_NEEDED]` comments before the
bot processes either (unlikely given the sequential pipeline, but possible during retries).

Handling:
1. The bot processes comments in order of `commentId` (ascending).
2. Each is routed to the same WI thread as a separate card.
3. The bot labels each card with its sequence: "Question 1 of 2" and "Question 2 of 2".
4. Responses are posted back in the same order.
5. The pipeline orchestrator processes responses in comment order.

---

## Adaptive Card Spec

Full Clarification card specification:
[`../bot/adaptive_cards/clarification_card.md`](../bot/adaptive_cards/clarification_card.md)
