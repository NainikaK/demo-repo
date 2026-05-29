# Intake Flow — User Message to ADO Work Item

## Overview

The intake flow covers the full conversation from the moment a user expresses intent
to create a new feature, through guided data collection, to the creation of the ADO
work item that triggers the pipeline.

The flow ends the moment the ADO work item is created. What happens after (pipeline
execution, notifications) is covered in [`notify_flow.md`](notify_flow.md).

---

## Trigger Conditions

The bot enters intake mode when a user sends a message that:

- Mentions creating a new feature, task, work item, or requirement
- Uses phrases such as "add", "build", "create", "implement", "I want", "we need",
  "new feature", "new task"
- Replies to a bot prompt asking whether they want to start a new request

The bot does NOT enter intake mode for:
- Messages starting with known commands ("status", "abort", "retry", "help")
- Messages that are replies to existing pipeline notification threads
- Messages from users who already have an intake in progress (the bot resumes the
  existing intake instead)

---

## Full Conversation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 0 — Intent Detection                                           │
│                                                                     │
│ User: "I want to add a dark/light mode toggle to the app"           │
│                                                                     │
│ Bot: Detects intake intent.                                         │
│      Checks for existing in-progress intake for this user.          │
│      If none: starts new intake session.                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1 — Title Collection                                           │
│                                                                     │
│ Bot sends Intake Form card (Step 1 of 4):                           │
│                                                                     │
│   "Let's create a new work item. What should we call this feature?" │
│   [Text input: Feature title]                                       │
│   [Next →]                                                          │
│                                                                     │
│ Bot pre-fills the title input with the user's original message      │
│ (trimmed and sentence-cased) as a suggestion.                       │
│                                                                     │
│ Validation:                                                         │
│ - Minimum 5 characters                                              │
│ - Maximum 120 characters                                            │
│ - Must not be blank                                                 │
│                                                                     │
│ If user clicks Next without editing the pre-filled suggestion,      │
│ the original message text is used as the title.                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2 — Description Collection                                     │
│                                                                     │
│ Bot sends Intake Form card (Step 2 of 4):                           │
│                                                                     │
│   "Describe what this feature should do. What problem does it       │
│    solve and who is it for?"                                        │
│   [Multi-line text input: Description]                              │
│   [← Back]  [Next →]                                               │
│                                                                     │
│ Validation:                                                         │
│ - Minimum 20 characters                                             │
│ - Maximum 2000 characters                                           │
│ - Must not be blank                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3 — Acceptance Criteria Collection                             │
│                                                                     │
│ Bot sends Intake Form card (Step 3 of 4):                           │
│                                                                     │
│   "What are the acceptance criteria? List the conditions that must  │
│    be true for this feature to be considered complete.              │
│    Tip: use 'Given / When / Then' or numbered bullet points."       │
│   [Multi-line text input: Acceptance criteria]                      │
│   [← Back]  [Next →]                                               │
│                                                                     │
│ Validation:                                                         │
│ - Minimum 20 characters                                             │
│ - Maximum 3000 characters                                           │
│ - Must not be blank                                                 │
│                                                                     │
│ The bot does not enforce Gherkin syntax at intake — the Clarification│
│ Agent will evaluate quality and ask follow-up questions if needed.  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4 — Priority Selection                                         │
│                                                                     │
│ Bot sends Intake Form card (Step 4 of 4):                           │
│                                                                     │
│   "What is the priority of this work?"                              │
│   [ Critical ]  [ High ]  [ Medium ]  [ Low ]                      │
│   [← Back]                                                          │
│                                                                     │
│ Pressing a priority button advances immediately to Step 5.          │
│ Default if not selected: Medium.                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5 — Requirement Confirmation Card                              │
│                                                                     │
│ Bot sends Requirement Confirmation card with full summary:          │
│                                                                     │
│   ┌──────────────────────────────────────────────────────┐         │
│   │  New Feature Request — Please Confirm                │         │
│   ├──────────────────────────────────────────────────────┤         │
│   │  Title:       Dark/Light Mode Toggle                 │         │
│   │  Priority:    High                                   │         │
│   │  Description: Users should be able to switch         │         │
│   │               between dark and light themes...       │         │
│   │  Criteria:    - Toggle visible in header             │         │
│   │               - Preference persists across sessions  │         │
│   ├──────────────────────────────────────────────────────┤         │
│   │  [ Edit ]                [ Confirm and Submit ]      │         │
│   └──────────────────────────────────────────────────────┘         │
│                                                                     │
│ "Edit" → return to Step 1 (all previously entered values retained) │
│ "Confirm and Submit" → proceed to Step 6                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6 — ADO Work Item Creation                                     │
│                                                                     │
│ Bot calls the ADO API to create the work item.                      │
│                                                                     │
│ ADO work item fields populated:                                     │
│   System.Title           = <user's title>                           │
│   System.WorkItemType    = Feature                                  │
│   System.State           = New                                      │
│   System.Tags            = ai-pipeline-trigger                      │
│   System.Description     = <user's description>                     │
│   Microsoft.VSTS.Common.AcceptanceCriteria = <user's criteria>      │
│   Microsoft.VSTS.Common.Priority = <mapped priority>                │
│   System.CreatedBy       = Pipeline Service (service account)       │
│   Custom.RequestedBy     = <Teams user display name>                │
│                                                                     │
│ Priority mapping:                                                   │
│   Critical → 1 (ADO Highest)                                        │
│   High     → 1                                                      │
│   Medium   → 2                                                      │
│   Low      → 3                                                      │
│                                                                     │
│ On success: ADO returns WI ID (e.g. 542).                           │
│ Bot stores: wi_id=542 → { teams_user_id, intake_completed_at }      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7 — Confirmation Notification                                  │
│                                                                     │
│ Bot creates a new Teams thread (or uses the existing DM thread)     │
│ for WI-542 and posts:                                               │
│                                                                     │
│   "WI-542 created — Dark/Light Mode Toggle                          │
│    Priority: High | Type: Feature                                   │
│    The pipeline is starting. I'll keep you updated here.            │
│    [View in ADO ↗]"                                                 │
│                                                                     │
│ All future pipeline notifications for WI-542 post in this thread.  │
│ Intake flow is complete.                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ADO Field Mapping

| Intake Form Field | ADO Field | Notes |
|------------------|----------|-------|
| Title | `System.Title` | Used verbatim |
| Description | `System.Description` | Wrapped in `<p>` tags |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | Wrapped in `<p>` tags |
| Priority (Critical) | `Microsoft.VSTS.Common.Priority` = 1 | |
| Priority (High) | `Microsoft.VSTS.Common.Priority` = 1 | |
| Priority (Medium) | `Microsoft.VSTS.Common.Priority` = 2 | |
| Priority (Low) | `Microsoft.VSTS.Common.Priority` = 3 | |
| Teams user display name | `Custom.RequestedBy` | If custom field exists |
| — (fixed) | `System.Tags` | Always `ai-pipeline-trigger` |
| — (fixed) | `System.WorkItemType` | Always `Feature` |
| — (fixed) | `System.State` | Always `New` |

---

## Error Handling

### ADO API call fails

If the ADO work item creation call returns an error:

1. Bot retries once after 5 seconds.
2. If retry also fails, bot posts to the user:
   "Sorry — I couldn't create the work item. Please try again or create it directly
   in ADO and add the `ai-pipeline-trigger` tag."
3. Bot preserves the intake session data for 1 hour so the user can retry without
   re-entering information.

### User abandons mid-intake

If the user does not interact with the intake form for more than 30 minutes:

1. Bot sends a single reminder: "Your feature request is still in progress. Would you
   like to continue? [Continue] [Cancel]"
2. If no response after a further 30 minutes (60 minutes total): bot discards the
   session and posts: "Your draft feature request was discarded due to inactivity.
   Send me a message any time to start again."

### User starts a second intake while one is in progress

Bot responds: "You have a feature request in progress ('Dark/Light Mode Toggle').
Would you like to continue that request, or start a new one?
[Continue existing] [Start new]"

If "Start new" is selected, the previous draft is discarded.

---

## Intake Form — Adaptive Card Spec

See [`../bot/adaptive_cards/intake_form.md`](../bot/adaptive_cards/intake_form.md) for
the full Adaptive Card JSON schema specification for the multi-step intake form.

See [`../bot/adaptive_cards/requirement_confirmation.md`](../bot/adaptive_cards/requirement_confirmation.md)
for the Requirement Confirmation card specification.
