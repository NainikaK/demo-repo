# Phase 2 — Adaptive Card JSON

Two Adaptive Cards are needed in Phase 2. This file contains the complete JSON for each,
along with instructions for where exactly to paste each one in the Copilot Studio UI.

Both cards use **Adaptive Card schema version 1.4**, which is fully supported in
Microsoft Teams.

---

## Card 1 — Requirement Confirmation Card

### Purpose

Shown after the user answers all four intake questions. Displays a read-only summary
of the collected requirement (title, priority, description, acceptance criteria) and
presents two action buttons: **Confirm & Submit** and **Edit**.

Based on spec: [`../bot/adaptive_cards/requirement_confirmation.md`](../bot/adaptive_cards/requirement_confirmation.md)

### Where to paste this in Copilot Studio

1. Open the **Requirement Intake** topic.
2. Find the **Send a message** node that comes after the Priority question node
   (this is the confirmation step — Copilot Studio setup guide Section 3.7).
3. In the message node, click **Add** → **Adaptive Card**.
4. Click **Edit JSON** in the card editor.
5. Delete all existing content.
6. Paste the JSON below.

> **Variable substitution:** `${Topic.RequirementTitle}` tokens are replaced at render
> time by Copilot Studio with the named topic variable values. Do not replace them
> with literal text — leave them as-is.

### JSON

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "bleed": true,
      "items": [
        {
          "type": "TextBlock",
          "text": "Confirm Your Feature Request",
          "weight": "Bolder",
          "size": "Large",
          "wrap": true,
          "color": "Accent"
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Title",
          "value": "${Topic.RequirementTitle}"
        },
        {
          "title": "Priority",
          "value": "${Topic.Priority}"
        }
      ],
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "Description",
      "weight": "Bolder",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "${Topic.RequirementDescription}",
      "wrap": true,
      "color": "Default"
    },
    {
      "type": "TextBlock",
      "text": "Acceptance Criteria",
      "weight": "Bolder",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "${Topic.AcceptanceCriteria}",
      "wrap": true,
      "color": "Default"
    },
    {
      "type": "TextBlock",
      "text": "Submitting will create an ADO work item and start the AI pipeline. The pipeline cannot be paused after it starts.",
      "wrap": true,
      "isSubtle": true,
      "size": "Small",
      "spacing": "Large"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Confirm & Submit",
      "data": {
        "confirm": true,
        "action": "confirm_requirement"
      },
      "style": "positive"
    },
    {
      "type": "Action.Submit",
      "title": "Edit",
      "data": {
        "confirm": false,
        "action": "edit_requirement"
      }
    }
  ]
}
```

### How Copilot Studio handles the Action.Submit response

When the user clicks **Confirm & Submit** or **Edit**, Teams sends the `data` object
from the clicked action back to the bot as the user's response. Copilot Studio captures
this in the `ConfirmationResponse` variable (set up in the Intake topic).

The `ConfirmationResponse` variable will contain the raw JSON data object as a text string:
- **Confirm & Submit:** `{"confirm":true,"action":"confirm_requirement"}`
- **Edit:** `{"confirm":false,"action":"edit_requirement"}`

The Condition node in the Intake topic (setup guide Section 3.9) checks whether the
response contains `"confirm":true` to branch the flow.

### Fallback if variable substitution is not supported

If Copilot Studio does not render `${Topic.X}` tokens in the card JSON, use this
approach instead:

1. Before the Message node, add a **Set variable** action.
2. Set variable `ConfirmationCardJson` (Text) using the Power Fx formula:

```
Concat(
  "{""$schema"":""http://adaptivecards.io/schemas/adaptive-card.json"",",
  """type"":""AdaptiveCard"",""version"":""1.4"",""body"":[",
  "{""type"":""TextBlock"",""text"":""Confirm Your Feature Request"",""weight"":""Bolder"",""size"":""Large"",""wrap"":true},",
  "{""type"":""FactSet"",""facts"":[",
  "{""title"":""Title"",""value"":""", Substitute(Topic.RequirementTitle, """", ""), """},",
  "{""title"":""Priority"",""value"":""", Topic.Priority, """}",
  "]},",
  "{""type"":""TextBlock"",""text"":""Description"",""weight"":""Bolder"",""wrap"":true},",
  "{""type"":""TextBlock"",""text"":""", Substitute(Topic.RequirementDescription, """", ""), """,""wrap"":true},",
  "{""type"":""TextBlock"",""text"":""Acceptance Criteria"",""weight"":""Bolder"",""wrap"":true},",
  "{""type"":""TextBlock"",""text"":""", Substitute(Topic.AcceptanceCriteria, """", ""), """,""wrap"":true}",
  "],""actions"":[",
  "{""type"":""Action.Submit"",""title"":""Confirm & Submit"",""data"":{""confirm"":true},""style"":""positive""},",
  "{""type"":""Action.Submit"",""title"":""Edit"",""data"":{""confirm"":false}}",
  "]}"
)
```

3. In the Message node → Adaptive Card → Edit JSON → switch to **Formula** view.
4. Reference `Topic.ConfirmationCardJson`.

---

## Card 2 — WI Created Success Card

### Purpose

Shown immediately after the Power Automate flow successfully creates the ADO work item.
Displays a clean confirmation with the work item ID, title, priority, and a link to ADO.
No action buttons — this is read-only.

### Where to paste this in Copilot Studio

1. Open the **Requirement Intake** topic.
2. Find the **Send a message** node in the True (success) branch after the Power Automate
   action node (Copilot Studio setup guide Section 3.12).
3. In the message node, click **Add** → **Adaptive Card**.
4. Click **Edit JSON**.
5. Delete all existing content.
6. Paste the JSON below.

> **Variable substitution:** `${Topic.WorkItemId}` and `${Topic.WorkItemUrl}` are
> populated from the Power Automate flow outputs. `${Topic.RequirementTitle}` and
> `${Topic.Priority}` carry forward from the intake conversation.

### JSON

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "Container",
      "style": "good",
      "bleed": true,
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "✅",
                  "size": "ExtraLarge"
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Work Item Created",
                  "weight": "Bolder",
                  "size": "Large",
                  "wrap": true
                },
                {
                  "type": "TextBlock",
                  "text": "WI-${Topic.WorkItemId}",
                  "weight": "Bolder",
                  "color": "Accent",
                  "wrap": true
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Title",
          "value": "${Topic.RequirementTitle}"
        },
        {
          "title": "Priority",
          "value": "${Topic.Priority}"
        },
        {
          "title": "Type",
          "value": "Task"
        },
        {
          "title": "State",
          "value": "New"
        },
        {
          "title": "Tag",
          "value": "ai-pipeline-trigger"
        }
      ],
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "The AI pipeline is starting. You will receive updates as it progresses through each stage.",
      "wrap": true,
      "isSubtle": true,
      "spacing": "Medium"
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View in ADO ↗",
      "url": "${Topic.WorkItemUrl}"
    }
  ]
}
```

### Notes on the Action.OpenUrl

The `url` field uses `${Topic.WorkItemUrl}`, which is populated from the Power Automate
flow output `WorkItemUrl`. This is the direct ADO browser link returned by the ADO API
in the `_links.html.href` field of the HTTP response.

If `${Topic.WorkItemUrl}` is not supported, construct the URL directly using the WI ID:

```json
"url": "https://dev.azure.com/nainika-dev/sdlc-agent/_workitems/edit/${Topic.WorkItemId}"
```

---

## Testing the Cards in the Adaptive Card Designer

To preview and verify the cards before pasting them into Copilot Studio:

1. Navigate to [adaptivecards.io/designer](https://adaptivecards.io/designer).
2. In the left "Card Payload Editor" panel, delete the existing JSON and paste the card JSON.
3. In the "Host App" selector at the top, choose **Microsoft Teams** to see the card
   as it will render in Teams.
4. Replace `${Topic.X}` tokens with sample literal values to preview the populated card.
   For example: replace `${Topic.RequirementTitle}` with `"Dark/Light Mode Toggle"`.
5. Verify:
   - All text fields are visible and wrap correctly
   - Buttons appear at the bottom
   - The card renders without errors in the "Card Preview" section

---

## Adaptive Card Schema Reference

Both cards use the following top-level structure:

| Property | Value | Notes |
|----------|-------|-------|
| `$schema` | `http://adaptivecards.io/schemas/adaptive-card.json` | Required |
| `type` | `AdaptiveCard` | Required |
| `version` | `1.4` | Supported in Teams; use 1.4 for FactSet and Container.style |

**Teams-specific limitations:**
- Maximum card width is fixed; do not use fixed pixel widths
- `Action.OpenUrl` opens links in the Teams browser or default browser
- `Action.Submit` sends data back to the bot; the bot must handle the response
- Cards cannot make direct HTTP calls — use bot actions for all API calls
- `Container` with `style: "emphasis"` or `style: "good"` provides coloured backgrounds
  (Teams renders these as subtle colour differences, not bold colors)
