# Phase 2 Build Guide: Adaptive Card JSON

## Overview

This guide provides the JSON structure for the confirmation message card that the
Copilot Studio bot displays before submitting a requirement to Azure DevOps.

---

## Confirmation Card Structure

The bot shows a confirmation card after collecting the requirement details. This
card displays the user's inputs and asks for final confirmation.

### Standard Confirmation Card

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Confirm Your Requirement",
      "weight": "bolder",
      "size": "large",
      "color": "accent"
    },
    {
      "type": "Container",
      "separator": true,
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Title",
                  "weight": "bolder",
                  "size": "small"
                },
                {
                  "type": "TextBlock",
                  "text": "{RequestTitle}",
                  "wrap": true,
                  "spacing": "none"
                }
              ]
            }
          ]
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Description",
                  "weight": "bolder",
                  "size": "small"
                },
                {
                  "type": "TextBlock",
                  "text": "{RequestDescription}",
                  "wrap": true,
                  "spacing": "none"
                }
              ]
            }
          ]
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Type",
                  "weight": "bolder",
                  "size": "small"
                },
                {
                  "type": "TextBlock",
                  "text": "{RequestType}",
                  "wrap": true,
                  "spacing": "none"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "✓ Create Work Item",
      "data": { "confirm": "yes" }
    },
    {
      "type": "Action.Submit",
      "title": "✗ Cancel",
      "data": { "confirm": "no" }
    }
  ]
}
```

### Key Elements

| Element | Purpose |
|---|---|
| `TextBlock` "Confirm Your Requirement" | Title of the card |
| `ColumnSet` with RequestTitle | Displays the user-provided title |
| `ColumnSet` with RequestDescription | Displays the full description |
| `ColumnSet` with RequestType | Displays Feature or User Story |
| `Action.Submit` "✓ Create Work Item" | User clicks to confirm and submit |
| `Action.Submit` "✗ Cancel" | User clicks to go back and edit |

---

## Variable Placeholders

In the card JSON above, replace the placeholders with actual variable references:

| Placeholder | Replace With |
|---|---|
| `{RequestTitle}` | Your Copilot Studio variable reference (e.g., `${RequestTitle}` or the variable syntax in your version) |
| `{RequestDescription}` | Your Copilot Studio variable reference (e.g., `${RequestDescription}`) |
| `{RequestType}` | Your Copilot Studio variable reference (e.g., `${RequestType}`) |

### Example in Copilot Studio

When you paste this JSON into Copilot Studio's message builder, the variable syntax
may differ. Copilot Studio typically uses:

```
@{variables('RequestTitle')}
@{variables('RequestDescription')}
@{variables('RequestType')}
```

Or, in the visual message builder, you may use the picker to insert variables directly
without JSON.

---

## Customization Options

### Change Button Colors

To style the buttons (e.g., make the confirm button green):

```json
{
  "type": "Action.Submit",
  "title": "✓ Create Work Item",
  "data": { "confirm": "yes" },
  "style": "positive"  // green button
}
```

Other style options: `default`, `positive`, `destructive`.

### Add ADO Project Context

To remind the user which ADO project will receive the work item, add a footer:

```json
{
  "type": "TextBlock",
  "text": "This will create a work item in {ADO_PROJECT} tagged with '{ADO_TRIGGER_TAG}'.",
  "size": "small",
  "color": "light",
  "wrap": true,
  "spacing": "small"
}
```

Replace `{ADO_PROJECT}` and `{ADO_TRIGGER_TAG}` with the actual values or variable references.

### Add Acceptance Criteria Section

If the description field is long, you can add a separate section for acceptance criteria:

```json
{
  "type": "TextBlock",
  "text": "Acceptance Criteria",
  "weight": "bolder",
  "size": "small"
},
{
  "type": "TextBlock",
  "text": "{AcceptanceCriteria}",
  "wrap": true,
  "spacing": "none"
}
```

---

## Adaptive Card Rendering

Adaptive Cards are rendered consistently across Teams, Outlook, and other channels.
The card above will display:

- A bold header "Confirm Your Requirement"
- Three read-only fields showing the user's inputs
- Two action buttons at the bottom: "✓ Create Work Item" and "✗ Cancel"

**Note:** The exact appearance may vary slightly depending on the Teams client
(desktop, mobile, web) and the user's theme settings.

---

## Testing the Card

### In Copilot Studio

1. Add a **Message** node in your topic
2. Click the **...** menu → **Insert an adaptive card**
3. Paste the JSON above
4. Click **Save**
5. Click **Test bot** and send a message to trigger the card

### On Teams

After deploying the bot to Teams (phase2-teams-deployment.md):

1. Open the bot in Teams
2. Complete the requirement collection flow
3. The confirmation card should appear
4. Click one of the action buttons
5. The bot should respond based on your choice

---

## Mobile Considerations

Adaptive Cards scale automatically for mobile devices. However:

- The card width adjusts to the screen size
- Button text wraps if needed
- Multi-line text (like Description) renders fully

If you want to optimize for mobile, keep button text short and descriptions concise.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Variables show as literal text like `{RequestTitle}` | Replace with your Copilot Studio variable reference syntax (e.g., `${RequestTitle}` or `@{variables('RequestTitle')}`) |
| Card doesn't render in Teams | Verify the JSON is valid (copy-paste into a JSON validator). Check Copilot Studio syntax for your version. |
| Action buttons don't work | Ensure the `Action.Submit` type is correct and `data` field is valid JSON. |

---

## References

- [Adaptive Cards Documentation](https://adaptivecards.io/)
- [Copilot Studio Message Actions](https://learn.microsoft.com/en-us/power-virtual-agents/authoring-send-message)

---

*Last updated: 2026-05-26*
