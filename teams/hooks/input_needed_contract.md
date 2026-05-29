# [TEAMS_INPUT_NEEDED] — Comment Contract

## Purpose

This contract defines the exact format that pipeline agents must use when they need a
human decision that cannot be resolved automatically. When a comment matching this
format is posted to an ADO work item, the Teams bot detects it, sends the appropriate
Adaptive Card to the user in the correct Teams thread, and posts the user's response
back to ADO as a new comment.

The pipeline agent's polling loop detects the response comment and resumes execution.
No agent is aware of Teams directly; they communicate only via ADO comments.

---

## Exact Comment Format

The comment body must match the following structure exactly. The prefix
`[TEAMS_INPUT_NEEDED]:` must appear on the first line, followed by a single space, then
a valid JSON object. No other content may appear before or after the JSON in the comment.

```
[TEAMS_INPUT_NEEDED]: {
  "question": "<the question to display to the user>",
  "context": "<one or two sentences explaining why this decision is needed>",
  "options": ["<option 1>", "<option 2>", "<option 3>"] | null,
  "wi_id": "<ADO work item ID, e.g. WI-542>",
  "agent": "<agent name, e.g. clarification_agent>"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | The exact question to display to the user in the Adaptive Card. Must be a complete sentence ending in "?" |
| `context` | string | Yes | One or two sentences explaining why the agent cannot proceed without this input. Shown below the question as supporting detail. |
| `options` | string[] or null | Yes | If the agent accepts only specific answers, provide an array of 2–4 option strings. If free-text input is acceptable, set to `null`. |
| `wi_id` | string | Yes | The ADO work item ID in the format "WI-{numeric_id}" (e.g. "WI-542"). Used by the bot to route the card to the correct Teams thread. |
| `agent` | string | Yes | Machine-readable name of the agent posting this comment (e.g. `clarification_agent`, `story_writer_agent`). Used in the card header and for logging. |

---

## Validation Rules

1. The comment body must start with `[TEAMS_INPUT_NEEDED]: ` (note the space after the colon).
2. Everything after the prefix must be valid JSON — parseable by `json.loads()` with no extra text.
3. No other content (introductory text, closing notes, newlines before or after) may appear in the comment.
4. `wi_id` must match the ID of the work item that contains the comment. A mismatch is a routing error.
5. `options`, if provided, must contain between 2 and 4 strings. Arrays of 1 or 5+ strings are invalid.
6. `question` must end with "?".
7. The comment must be posted by a pipeline service account (not a human user). The bot ignores `[TEAMS_INPUT_NEEDED]` patterns in comments posted by human accounts to prevent loops.

---

## Examples

### Example 1 — Options-based clarification (Clarification Agent)

```
[TEAMS_INPUT_NEEDED]: {
  "question": "Where should the dark/light mode toggle be placed in the UI?",
  "context": "The requirement mentions a toggle but does not specify its location. This affects which component the Frontend Agent modifies.",
  "options": ["Top-right corner of the navigation bar", "Inside the Settings page only", "Both the navigation bar and the Settings page"],
  "wi_id": "WI-542",
  "agent": "clarification_agent"
}
```

### Example 2 — Free-text clarification (Clarification Agent)

```
[TEAMS_INPUT_NEEDED]: {
  "question": "What should the default theme be when a user visits the app for the first time?",
  "context": "The acceptance criteria state that the preference persists across sessions, but does not specify the initial default. This determines the starting state in the React context.",
  "options": null,
  "wi_id": "WI-542",
  "agent": "clarification_agent"
}
```

### Example 3 — Duplicate work item decision (Story Writer Agent)

```
[TEAMS_INPUT_NEEDED]: {
  "question": "A possible duplicate work item was found (WI-498: 'Add theme switcher'). Should the pipeline continue with the new work item or link to and close the existing one?",
  "context": "The Story Writer Agent detected a near-identical title in ADO. Proceeding would create duplicate user stories.",
  "options": ["Continue with new WI-542", "Link to existing WI-498 and close WI-542"],
  "wi_id": "WI-542",
  "agent": "story_writer_agent"
}
```

---

## What the Bot Does When It Detects This Pattern

When the ADO "comment added" webhook fires and the bot inspects the comment body:

1. **Detect prefix:** The bot checks whether the comment starts with `[TEAMS_INPUT_NEEDED]: `.
2. **Validate JSON:** The bot attempts to parse the JSON suffix. If parsing fails, it posts
   an error notification to the Teams thread and does not send a card.
3. **Route to thread:** The bot looks up the Teams thread ID associated with the `wi_id` in its
   state store. If no thread exists (e.g. the WI was created outside Teams), it falls back to
   posting in the configured default pipeline-alerts channel.
4. **Select card type:** If `options` is a non-empty array, the bot sends a Clarification card
   with option buttons. If `options` is null, it sends a Clarification card with a free-text
   input field.
5. **Display context:** Both variants display the `question` as the card title and `context`
   as body text, along with the agent name and WI ID in the card footer.
6. **Start timeout timer:** The bot starts a configurable timeout (default: 24 hours).
   If no response is received, the bot sends a reminder. If no response after 48 hours,
   the bot posts a timeout comment to ADO (see Timeout Handling below).
7. **Wait for user action:** The bot listens for the user's card submission.

See [`bot/adaptive_cards/clarification_card.md`](../bot/adaptive_cards/clarification_card.md)
for the full card specification.

---

## Response Format — Bot Posts Back to ADO

When the user responds to the Clarification card, the bot posts a new comment to the same
ADO work item using the following format:

```
[TEAMS_INPUT_RESPONSE]: {
  "answer": "<the user's answer — either the selected option text or the free-text input>",
  "wi_id": "<same wi_id from the original [TEAMS_INPUT_NEEDED] comment>",
  "agent": "<same agent name from the original comment>",
  "responded_by": "<Teams user display name>",
  "responded_at": "<ISO 8601 timestamp>"
}
```

### Response Example

```
[TEAMS_INPUT_RESPONSE]: {
  "answer": "Top-right corner of the navigation bar",
  "wi_id": "WI-542",
  "agent": "clarification_agent",
  "responded_by": "Jane Smith",
  "responded_at": "2026-05-20T14:32:00Z"
}
```

The pipeline agent's polling logic must look for a comment starting with
`[TEAMS_INPUT_RESPONSE]:` following its original `[TEAMS_INPUT_NEEDED]` comment.
The agent parses the `answer` field and continues execution with that value.

---

## Timeout Handling

If the user does not respond within the configured timeout window:

| Elapsed Time | Bot Action |
|-------------|-----------|
| 24 hours | Bot sends a reminder message in the Teams thread referencing the pending question |
| 48 hours | Bot posts a timeout comment to ADO: `[TEAMS_INPUT_TIMEOUT]: {"wi_id": "WI-542", "agent": "clarification_agent", "timed_out_at": "<ISO timestamp>"}` |
| After timeout post | Pipeline orchestrator detects the timeout comment and marks the WI as PIPELINE_FAILED with reason `human_input_timeout` |

---

## Agents That Will Use This Contract (Phase 4)

The following agents currently handle human decisions without Teams awareness. In Phase 4,
each will be updated to post `[TEAMS_INPUT_NEEDED]` comments instead of their current
blocking behavior:

| Agent | Current Behavior | Phase 4 Change |
|-------|-----------------|----------------|
| **Clarification Agent** | Posts clarifying questions to ADO as plain comments; orchestrator polls for PO update | Replace plain comment with `[TEAMS_INPUT_NEEDED]` JSON; resume on `[TEAMS_INPUT_RESPONSE]` |
| **Story Writer Agent** | Posts `[DEPENDENCY MISSING]` and `[POSSIBLE DUPLICATE]` flags as plain comments; blocks pipeline | Replace flags with `[TEAMS_INPUT_NEEDED]` JSON with options; resume based on user choice |
| **Supervisor Agent** | Opens draft PR at score 7.0–7.99; waits for human to manually promote via GitHub | Post `[TEAMS_INPUT_NEEDED]` comment with approval question; bot sends Approval card; merge decision posted back as `[TEAMS_INPUT_RESPONSE]` |

No agent files are modified in Phase 1. This contract document is the specification
that Phase 4 implementation will follow.
