# Adaptive Card: Requirement Confirmation

## Purpose

Shown after the user completes all four steps of the Intake Form. Presents a full
read-only summary of the collected requirement for the user to review before the bot
creates the ADO work item. The user either confirms (creates the WI) or returns to edit.

---

## Elements Shown

**Header:** `Confirm Your Feature Request`

**Body — summary table:**

| Field | Value |
|-------|-------|
| Title | {title} |
| Priority | {priority} |
| Description | {description — full text, scrollable if long} |
| Acceptance Criteria | {acceptance_criteria — full text, scrollable if long} |

All four fields are read-only labels. No input elements are present on this card.

**Footer text (small, muted):**
"Submitting creates an ADO work item and starts the AI pipeline. The pipeline cannot be
paused after it starts."

---

## Buttons / Actions

| Button | Label | Action |
|--------|-------|--------|
| Primary | `Confirm and Submit` | Creates ADO work item; posts WI-created notification; closes card with "Submitted ✓" |
| Secondary | `Edit` | Returns to Step 1 of the Intake Form with all fields pre-filled from session state |

No other actions are available on this card.

---

## Data Required to Render

All data comes from the completed intake session state.

```json
{
  "title": "Dark/Light Mode Toggle",
  "description": "Users should be able to switch between dark and light themes. The selected preference must persist across browser sessions using localStorage.",
  "acceptance_criteria": "1. A toggle button is visible in the top-right corner of the navigation bar.\n2. Clicking the toggle switches the app theme immediately without a page reload.\n3. The selected theme persists after the user closes and reopens the browser.\n4. The default theme for new users is light mode.",
  "priority": "High"
}
```

---

## What the Bot Does with the User's Response

### On "Confirm and Submit"

1. Bot calls the ADO API to create the work item:
   - `System.Title` = title
   - `System.WorkItemType` = Feature
   - `System.State` = New
   - `System.Tags` = ai-pipeline-trigger
   - `System.Description` = description (HTML-encoded)
   - `Microsoft.VSTS.Common.AcceptanceCriteria` = acceptance_criteria (HTML-encoded)
   - `Microsoft.VSTS.Common.Priority` = mapped from priority string
2. On success: card updates to show "Submitted — WI-{id} created ✓" with ADO link.
3. Bot creates a new Teams thread for WI-{id} and posts notification N1.

### On "Edit"

1. Bot discards the confirmation card.
2. Bot re-sends the Intake Form at Step 1, with all fields pre-filled from session state.

### On ADO API failure

1. Card updates to show error state: "Submission failed. Please try again."
2. Retry and Cancel buttons appear.
3. Bot retries once automatically after 5 seconds. If the retry also fails, the card
   shows: "Could not reach ADO. Please create the work item manually or try again later."

---

## Card State After Submission

Once submitted successfully, the card is updated in-place to a static confirmation:

```
✓ Work item created — WI-{id}
Dark/Light Mode Toggle
Priority: High

The pipeline is starting. Updates will appear in this thread.
[View in ADO ↗]
```

The card is no longer interactive after submission. No further buttons are shown.
