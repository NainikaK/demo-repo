# Adaptive Card: Intake Form

## Purpose

Guides the user through a four-step conversation to collect the information needed to
create an ADO work item. Each step is a separate card state (the bot updates or replaces
the card as the user advances). The card is shown when the bot detects a new feature
intake intent.

---

## Card Steps

The intake form is a four-step wizard. Each step is rendered as a separate Adaptive Card.
The bot tracks current step in conversation state.

### Step 1 of 4 — Feature Title

**Header:** `New Feature Request (1/4) — Title`

**Elements shown:**
- Instructional text: "What should we call this feature? Keep the title short and specific."
- Text input field (single line)
  - Placeholder: "e.g. Dark/Light Mode Toggle"
  - Max length: 120 characters
  - Pre-filled with the user's original message text (trimmed, max 120 chars)
  - Required: true

**Buttons/actions:**
- `Next →` — validates input (non-empty, ≥ 5 chars, ≤ 120 chars) and advances to Step 2
- `Cancel` — discards intake and posts "Intake cancelled."

**Bot state after Step 1:**
```json
{ "step": 1, "title": "<user input>" }
```

---

### Step 2 of 4 — Description

**Header:** `New Feature Request (2/4) — Description`

**Elements shown:**
- Summary line: `Title: {title from Step 1}`
- Instructional text: "Describe what this feature should do. What problem does it solve and who is it for?"
- Multi-line text input
  - Placeholder: "Explain the feature purpose, the user need it addresses, and any relevant context..."
  - Min length: 20 characters
  - Max length: 2000 characters
  - Required: true

**Buttons/actions:**
- `← Back` — returns to Step 1 with title field pre-filled from state
- `Next →` — validates and advances to Step 3

**Bot state after Step 2:**
```json
{ "step": 2, "title": "...", "description": "<user input>" }
```

---

### Step 3 of 4 — Acceptance Criteria

**Header:** `New Feature Request (3/4) — Acceptance Criteria`

**Elements shown:**
- Summary lines: `Title: {title}` (truncated at 60 chars if longer)
- Instructional text: "List the conditions that must be true for this feature to be considered complete. Use numbered points or Given/When/Then format."
- Multi-line text input
  - Placeholder: "1. The toggle is visible in the navigation bar\n2. Selecting dark mode applies the theme immediately\n3. The preference persists after the user logs out and back in"
  - Min length: 20 characters
  - Max length: 3000 characters
  - Required: true

**Buttons/actions:**
- `← Back` — returns to Step 2
- `Next →` — validates and advances to Step 4

**Bot state after Step 3:**
```json
{ "step": 3, "title": "...", "description": "...", "acceptance_criteria": "<user input>" }
```

---

### Step 4 of 4 — Priority

**Header:** `New Feature Request (4/4) — Priority`

**Elements shown:**
- Summary lines: `Title: {title}` and `Description: {description, first 80 chars}...`
- Instructional text: "What is the priority of this work item?"
- Four choice buttons displayed horizontally (or stacked on narrow viewports):
  - `Critical` — pipeline impact, blocking production
  - `High` — important, needed in next sprint
  - `Medium` — standard backlog priority
  - `Low` — nice-to-have, no deadline

**Buttons/actions:**
- `← Back` — returns to Step 3
- Each priority button is an action that sets priority and advances to Confirmation

**Bot state after Step 4:**
```json
{ "step": 4, "title": "...", "description": "...", "acceptance_criteria": "...", "priority": "High" }
```

---

## Data Required to Render Each Step

| Step | Data needed | Source |
|------|------------|--------|
| Step 1 | Original user message text | Bot conversation context |
| Step 2 | title (from Step 1) | Bot session state |
| Step 3 | title (from Step 1) | Bot session state |
| Step 4 | title, description (truncated) | Bot session state |

---

## What the Bot Does with the Completed Form

After Step 4, the bot transitions to the Requirement Confirmation card
([`requirement_confirmation.md`](requirement_confirmation.md)) showing all collected
fields for the user to review before submission.

The complete intake session state passed to the Confirmation card:
```json
{
  "title": "Dark/Light Mode Toggle",
  "description": "Users should be able to switch between dark and light themes...",
  "acceptance_criteria": "1. Toggle visible in navbar\n2. Preference persists across sessions",
  "priority": "High"
}
```

---

## Session Timeout

If the user does not interact with the intake form for 30 minutes, the bot sends:
"Your feature request draft is still open. Continue? [Continue] [Discard]"

If no response for a further 30 minutes, the session is discarded and the bot posts:
"Your draft was discarded due to inactivity. Send a message to start again."

---

## Validation Errors

Each validation error replaces the card with the same step card plus an error banner:

```
⚠ Title must be at least 5 characters. Please try again.
```

The previously entered value is retained in the input field.
