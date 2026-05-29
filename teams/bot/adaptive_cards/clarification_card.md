# Adaptive Card: Clarification Card

## Purpose

Shown when a pipeline agent posts a `[TEAMS_INPUT_NEEDED]` comment to an ADO work item.
The card presents the agent's question and collects the user's response.

Two variants exist: one with option buttons (when the agent provides a fixed set of
choices) and one with a free-text input field (when the agent accepts any answer).

---

## Card Variant A — Options-Based

Used when the `[TEAMS_INPUT_NEEDED]` payload contains a non-null `options` array.

**Header:** `Agent Input Required — WI-{wi_id}`

**Sub-header (small, muted):** `{agent_display_name}  ·  {timestamp}`

**Body:**

```
{question}

Context:
{context}
```

**Option buttons:**
- One button per entry in `options` array (maximum 4 buttons)
- Buttons are displayed as a column of full-width choices, not horizontal inline
- Each button label is the option text verbatim

**Footer (small, muted):**
"Your response will be posted to ADO and sent to the pipeline agent."

---

## Card Variant B — Free-Text Input

Used when the `[TEAMS_INPUT_NEEDED]` payload has `options: null`.

**Header:** `Agent Input Required — WI-{wi_id}`

**Sub-header (small, muted):** `{agent_display_name}  ·  {timestamp}`

**Body:**

```
{question}

Context:
{context}
```

**Input element:**
- Multi-line text input
- Placeholder: "Type your answer here..."
- Max length: 500 characters
- Required: true

**Button:** `Submit`

**Footer (small, muted):**
"Your response will be posted to ADO and sent to the pipeline agent."

---

## Buttons / Actions

| Variant | Element | Action |
|---------|---------|--------|
| A | Option button (one per choice) | Captures selected option text as `answer`; posts `[TEAMS_INPUT_RESPONSE]` to ADO; collapses card |
| B | Submit button | Validates text input (non-empty); posts `[TEAMS_INPUT_RESPONSE]` to ADO; collapses card |

No Cancel or Skip button is provided. The user must respond or wait for timeout.

---

## Data Required to Render

All data comes from the parsed `[TEAMS_INPUT_NEEDED]` JSON comment in ADO.

```json
{
  "question": "Where should the dark/light mode toggle be placed in the UI?",
  "context": "The requirement mentions a toggle but does not specify its location in the interface. This affects which component the Frontend Agent modifies.",
  "options": ["Top-right corner of the navigation bar", "Inside the Settings page only", "Both the navigation bar and the Settings page"],
  "wi_id": "WI-542",
  "agent": "clarification_agent"
}
```

**Agent display name mapping** (for the card sub-header):

| `agent` field value | Display name |
|--------------------|-------------|
| `clarification_agent` | Clarification Agent |
| `story_writer_agent` | Story Writer Agent |
| `spec_agent` | Spec Agent |
| `frontend_agent` | Frontend Agent |
| `backend_agent` | Backend Agent |
| `test_agent` | Test Agent |
| `audit_agent` | Audit Agent |
| `supervisor_agent` | Supervisor Agent |
| Unknown value | Pipeline Agent |

---

## What the Bot Does with the User's Response

### On option selected or Submit clicked

1. Bot validates the input (non-empty for free text).
2. Bot posts to ADO:
   ```
   [TEAMS_INPUT_RESPONSE]: {
     "answer": "<selected option or typed text>",
     "wi_id": "WI-542",
     "agent": "clarification_agent",
     "responded_by": "<Teams user display name>",
     "responded_at": "<ISO 8601 timestamp>"
   }
   ```
3. Card collapses to static confirmation:
   ```
   ✓ Response submitted — WI-{id}
   Answer: {answer}
   Responded by {user} at {time}
   The pipeline will resume shortly.
   ```
4. Bot posts text message in thread: "Your response has been sent to the pipeline agent."

### On timeout (48 hours, no response)

See [`../../hooks/input_needed_contract.md`](../../hooks/input_needed_contract.md)
for the full timeout handling specification.

Card state after timeout:
```
⏱ This question timed out — WI-{id}
No response was received within 48 hours.
The pipeline has been marked as failed.
[Retry pipeline] [View in ADO]
```

---

## First-Responder Rule

If multiple users are in the WI thread and more than one user tries to respond:

1. The first response received is accepted and posted to ADO.
2. The card updates for all users to show "Responded by {first_user} at {time}."
3. Any subsequent submission from another user is silently discarded by the bot.
4. No error is shown to the second user — the card simply shows the first response.

---

## Re-prompt on Rejection

If the pipeline agent finds the response insufficient and posts another
`[TEAMS_INPUT_NEEDED]` comment, the bot sends a new Clarification card to the same
thread. The previous card retains its collapsed "Response submitted" state.
A fresh card appears below it in the thread.
