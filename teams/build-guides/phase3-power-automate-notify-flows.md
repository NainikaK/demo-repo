# Phase 3 Build Guide: Power Automate Notify Flows

## Overview

This guide builds two new Power Automate flows that receive ADO service hook events
and relay them as Teams messages.

| Flow | Name | Purpose |
|---|---|---|
| Flow A | `SDLC - ADO State Notifier` | Receives work item and PR events; posts status messages to Teams |
| Flow B | `SDLC - ADO Comment Relay` | Receives comment events; routes to human-input card or preview message |

Both flows must be created in the **SDLC Bot** Power Automate environment so they can
be called by Copilot Studio (same environment requirement as Phase 2 flows).

**Placeholders used in this guide:**

| Placeholder | Replace With |
|---|---|
| `{ADO_ORG}` | Your Azure DevOps organization name |
| `{ADO_PROJECT}` | Your Azure DevOps project name |
| `{ADO_TRIGGER_TAG}` | Your pipeline trigger tag (default: `ai-pipeline-trigger`) |
| `{ADO_ASSIGNEE_EMAIL}` | Email of the work item assignee |
| `{TEAMS_USER_EMAIL}` | Your Teams / M365 email address where messages are delivered |

---

# Flow A: SDLC - ADO State Notifier

## Overview

Receives webhook payloads from ADO service hooks for three event types:
- `workitem.created` — pipeline just picked up a new work item
- `workitem.updated` — work item state changed
- `git.pullrequest.created` — Supervisor Agent opened a PR

Posts a Teams chat message for each event.

---

## Section A1: Create the Flow

1. Open **Power Automate** (`https://make.powerautomate.com`)
2. Top right: select the **SDLC Bot** environment
3. Left sidebar: click **+ Create** → **Instant cloud flow**
4. Name: `SDLC - ADO State Notifier`
5. Trigger: scroll to find **When an HTTP request is received** (listed under "Request")
6. Click **Create**

---

## Section A2: Initialize Config Variables

Add four **Initialize variable** actions immediately after the HTTP trigger.
All ADO URIs and field values in later steps must reference these variables.

**Action 1 — ADO_ORG**
- Name: `ADO_ORG`
- Type: String
- Value: `{ADO_ORG}` ← replace with your org name (e.g., `myorg`)

**Action 2 — ADO_PROJECT**
- Name: `ADO_PROJECT`
- Type: String
- Value: `{ADO_PROJECT}` ← replace with your project name

**Action 3 — ADO_TRIGGER_TAG**
- Name: `ADO_TRIGGER_TAG`
- Type: String
- Value: `{ADO_TRIGGER_TAG}` ← replace with your trigger tag (e.g., `ai-pipeline-trigger`)

**Action 4 — ADO_ASSIGNEE_EMAIL**
- Name: `ADO_ASSIGNEE_EMAIL`
- Type: String
- Value: `{ADO_ASSIGNEE_EMAIL}` ← replace with the assignee email

Reference variables in expressions as: `@variables('ADO_ORG')`, `@variables('ADO_PROJECT')`, etc.

---

## Section A3: Parse the Webhook Payload

1. Click **+ New step**
2. Search: `Parse JSON`
3. Action: **Parse JSON** (by Microsoft)
4. Configure:
   - **Content:** `@triggerBody()`  _(the raw HTTP body from ADO)_
   - **Schema:** paste the schema below

```json
{
  "type": "object",
  "properties": {
    "eventType": { "type": "string" },
    "resource": {
      "type": "object",
      "properties": {
        "id": { "type": "integer" },
        "pullRequestId": { "type": "integer" },
        "title": { "type": "string" },
        "_links": {
          "type": "object",
          "properties": {
            "web": {
              "type": "object",
              "properties": {
                "href": { "type": "string" }
              }
            }
          }
        },
        "fields": {
          "type": "object",
          "properties": {
            "System.Title": {
              "type": ["object", "string"],
              "properties": {
                "newValue": { "type": "string" }
              }
            },
            "System.State": {
              "type": ["object", "string"],
              "properties": {
                "newValue": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

5. Click **Done**

**Extracting values from the parsed body:**

| Value | Expression |
|---|---|
| Event type | `@body('Parse_JSON')?['eventType']` |
| Work item ID | `@body('Parse_JSON')?['resource']?['id']` |
| Work item title (created) | `@body('Parse_JSON')?['resource']?['fields']?['System.Title']?['newValue']` |
| New state | `@body('Parse_JSON')?['resource']?['fields']?['System.State']?['newValue']` |
| PR ID | `@body('Parse_JSON')?['resource']?['pullRequestId']` |
| PR title | `@body('Parse_JSON')?['resource']?['title']` |
| PR URL | `@body('Parse_JSON')?['resource']?['_links']?['web']?['href']` |

---

## Section A4: Switch on Event Type

1. Click **+ New step**
2. Search: `Switch`
3. Action: **Switch** (Control)
4. Configure:
   - **On:** `@body('Parse_JSON')?['eventType']`

This creates a Switch block. Add three cases:

### Case 1: workitem.created

1. Click **+ Add Case**
2. **Equals:** `workitem.created`
3. Inside the case, click **+ Add an action**
4. Search: `Post message in a chat or channel`
5. Action: **Post message in a chat or channel** (Microsoft Teams)
6. Configure:
   - **Post as:** Flow bot
   - **Post in:** Chat with bot
   - **Recipient:** `{TEAMS_USER_EMAIL}` ← replace with your Teams email
   - **Message:**
     ```
     ⚙️ Pipeline started for WI-@{body('Parse_JSON')?['resource']?['id']}: @{body('Parse_JSON')?['resource']?['fields']?['System.Title']?['newValue']}
     ```

### Case 2: workitem.updated

1. Click **+ Add Case**
2. **Equals:** `workitem.updated`
3. Inside the case, add a **Condition** action:
   - Condition A: `@body('Parse_JSON')?['resource']?['fields']?['System.State']?['newValue']` **is equal to** `Active`

   **If yes:**
   - Post Teams message:
     ```
     🔄 WI-@{body('Parse_JSON')?['resource']?['id']} is now Active — agents are working
     ```

4. Add an **else if** by clicking **+ Add** → **Add else if**:
   - Condition: State **is equal to** `Resolved`
   - Post Teams message:
     ```
     ✅ WI-@{body('Parse_JSON')?['resource']?['id']} Resolved — pipeline complete
     ```

5. Add another **else if**:
   - Condition: State **is equal to** `Closed`
   - Post Teams message:
     ```
     🔒 WI-@{body('Parse_JSON')?['resource']?['id']} Closed
     ```

6. In the final **else** branch (any other state):
   - Post Teams message:
     ```
     🔔 WI-@{body('Parse_JSON')?['resource']?['id']} state changed to @{body('Parse_JSON')?['resource']?['fields']?['System.State']?['newValue']}
     ```

   For all Post message actions in this case, use the same settings:
   - **Post as:** Flow bot
   - **Post in:** Chat with bot
   - **Recipient:** `{TEAMS_USER_EMAIL}`

### Case 3: git.pullrequest.created

1. Click **+ Add Case**
2. **Equals:** `git.pullrequest.created`
3. Inside the case, Post Teams message:
   - **Post as:** Flow bot
   - **Post in:** Chat with bot
   - **Recipient:** `{TEAMS_USER_EMAIL}`
   - **Message:**
     ```
     🔀 PR raised: @{body('Parse_JSON')?['resource']?['title']} — @{body('Parse_JSON')?['resource']?['_links']?['web']?['href']}
     ```

---

## Section A5: Add a Default Response

After the Switch block, add a Response action so ADO receives a 200 OK.

1. Click **+ New step** (outside the Switch)
2. Search: `Response`
3. Action: **Response** (Request)
4. Configure:
   - **Status Code:** `200`
   - **Body:** `{"status": "ok"}`

---

## Section A6: Save and Get the HTTP Trigger URL

1. Click **Save** (top right)
2. Click back into the **HTTP trigger** card at the top of the flow
3. The **HTTP POST URL** field is now populated
4. Click the copy icon next to the URL
5. Save this URL as `{FLOW_A_URL}` — paste it into the ADO service hooks for Events 1, 2, and 4 (phase3-ado-service-hooks.md)

---

---

# Flow B: SDLC - ADO Comment Relay

## Overview

Receives `workitem.commented` events from ADO. Routes on whether the comment contains
the `[TEAMS_INPUT_NEEDED]` prefix:
- **Yes** → posts an Adaptive Card to Teams requesting human input
- **No** → posts a 200-character preview of the comment

---

## Section B1: Create the Flow

1. Power Automate → SDLC Bot environment
2. **+ Create** → **Instant cloud flow**
3. Name: `SDLC - ADO Comment Relay`
4. Trigger: **When an HTTP request is received**
5. Click **Create**

---

## Section B2: Initialize Config Variables

Same four variables as Flow A — required by the Architecture Rule:

**Action 1 — ADO_ORG:** String, value `{ADO_ORG}`
**Action 2 — ADO_PROJECT:** String, value `{ADO_PROJECT}`
**Action 3 — ADO_TRIGGER_TAG:** String, value `{ADO_TRIGGER_TAG}`
**Action 4 — ADO_ASSIGNEE_EMAIL:** String, value `{ADO_ASSIGNEE_EMAIL}`

---

## Section B3: Parse the Comment Payload

1. Click **+ New step**
2. Action: **Parse JSON**
3. Configure:
   - **Content:** `@triggerBody()`
   - **Schema:** paste the schema below

```json
{
  "type": "object",
  "properties": {
    "eventType": { "type": "string" },
    "resource": {
      "type": "object",
      "properties": {
        "id": { "type": "integer" },
        "comment": {
          "type": "object",
          "properties": {
            "text": { "type": "string" }
          }
        },
        "fields": {
          "type": "object",
          "properties": {
            "System.Title": {
              "type": "object",
              "properties": {
                "newValue": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

4. Click **Done**

**Key expressions:**

| Value | Expression |
|---|---|
| Work item ID | `@body('Parse_JSON')?['resource']?['id']` |
| Comment text | `@body('Parse_JSON')?['resource']?['comment']?['text']` |
| Work item title | `@body('Parse_JSON')?['resource']?['fields']?['System.Title']?['newValue']` |

---

## Section B4: Condition — Contains [TEAMS_INPUT_NEEDED]

1. Click **+ New step**
2. Action: **Condition** (Control)
3. Configure the condition:
   - Click **Choose a value** → enter expression:
     `@contains(body('Parse_JSON')?['resource']?['comment']?['text'], '[TEAMS_INPUT_NEEDED]')`
   - Operator: **is equal to**
   - Value: `true`

This creates a **Yes** branch and a **No** branch.

---

## Section B5: YES Branch — Human Input Required

The comment text after `[TEAMS_INPUT_NEEDED] ` is a JSON string with these fields:

```json
{
  "question": "Is the icon purely decorative or should it be interactive?",
  "context": "The spec says decorative but ADO discussion says interactive.",
  "options": ["Decorative (no click handler)", "Interactive (add onClick)"],
  "wi_id": 42,
  "agent": "Clarification Agent"
}
```

### B5.1: Extract the JSON Payload from the Comment

1. Inside the **Yes** branch, click **+ Add an action**
2. Action: **Compose** (Data Operations)
3. Expression:
   ```
   @substring(
     body('Parse_JSON')?['resource']?['comment']?['text'],
     add(indexOf(body('Parse_JSON')?['resource']?['comment']?['text'], '[TEAMS_INPUT_NEEDED] '), 21)
   )
   ```
   _(21 = length of `[TEAMS_INPUT_NEEDED] ` including the trailing space)_
4. Name this action: `ExtractInputPayload`

### B5.2: Parse the Extracted JSON

1. Click **+ Add an action**
2. Action: **Parse JSON**
3. Configure:
   - **Content:** `@outputs('ExtractInputPayload')`
   - **Schema:**

```json
{
  "type": "object",
  "properties": {
    "question": { "type": "string" },
    "context":  { "type": "string" },
    "options":  {
      "type": "array",
      "items": { "type": "string" }
    },
    "wi_id":    { "type": "integer" },
    "agent":    { "type": "string" }
  }
}
```

4. Name this action: `ParseInputPayload`

### B5.3: Post the Human Input Adaptive Card

1. Click **+ Add an action**
2. Search: `Post adaptive card`
3. Action: **Post an Adaptive Card to a Teams user and wait for a response** (Teams)
4. Configure:
   - **Recipient:** `{TEAMS_USER_EMAIL}` ← replace with your Teams email
   - **Adaptive Card:** paste the JSON below
   - **Update message:** `Thank you — your response has been submitted.`
   - **Should update card:** Yes

**Adaptive Card JSON for human input:**

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "🤖 Agent Input Required",
      "weight": "bolder",
      "size": "large",
      "color": "accent"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Work Item", "value": "WI-@{body('ParseInputPayload')?['wi_id']}" },
        { "title": "Agent",     "value": "@{body('ParseInputPayload')?['agent']}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Question",
      "weight": "bolder",
      "spacing": "medium"
    },
    {
      "type": "TextBlock",
      "text": "@{body('ParseInputPayload')?['question']}",
      "wrap": true,
      "spacing": "none"
    },
    {
      "type": "TextBlock",
      "text": "Context",
      "weight": "bolder",
      "spacing": "medium"
    },
    {
      "type": "TextBlock",
      "text": "@{body('ParseInputPayload')?['context']}",
      "wrap": true,
      "spacing": "none",
      "color": "light"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "UserChoice",
      "style": "expanded",
      "choices": [
        { "title": "@{body('ParseInputPayload')?['options'][0]}", "value": "0" },
        { "title": "@{body('ParseInputPayload')?['options'][1]}", "value": "1" }
      ]
    },
    {
      "type": "Input.Text",
      "id": "FreeTextResponse",
      "placeholder": "Or type your own response here...",
      "isMultiline": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Submit Response"
    }
  ]
}
```

**Note:** The user's response should be relayed back to the `SDLC Pipeline Bot` in
Teams chat for the pipeline agent to consume. The actual relay mechanism (posting the
response as an ADO comment) can be added as a subsequent action.

---

## Section B6: NO Branch — Standard Comment Preview

1. Inside the **No** branch, click **+ Add an action**
2. Action: **Post message in a chat or channel** (Teams)
3. Configure:
   - **Post as:** Flow bot
   - **Post in:** Chat with bot
   - **Recipient:** `{TEAMS_USER_EMAIL}`
   - **Message:** use the expression below

```
💬 Agent update on WI-@{body('Parse_JSON')?['resource']?['id']}: @{substring(body('Parse_JSON')?['resource']?['comment']?['text'], 0, min(200, length(body('Parse_JSON')?['resource']?['comment']?['text'])))}
```

This extracts the first 200 characters of the comment as a preview.

---

## Section B7: Add a Default Response

After the Condition block (outside both branches):

1. Click **+ New step**
2. Action: **Response**
3. **Status Code:** `200`
4. **Body:** `{"status": "ok"}`

---

## Section B8: Save and Get the HTTP Trigger URL

1. Click **Save**
2. Click the **HTTP trigger** card at the top of the flow
3. Copy the **HTTP POST URL**
4. Save this URL as `{FLOW_B_URL}` — paste it into the ADO service hook for Event 3 (phase3-ado-service-hooks.md)

---

## Flow Diagram

```
Flow A: SDLC - ADO State Notifier
─────────────────────────────────────────────────────────────
HTTP Trigger (ADO webhook)
    │
    ├── Initialize Variables (ADO_ORG, ADO_PROJECT, ADO_TRIGGER_TAG, ADO_ASSIGNEE_EMAIL)
    │
    ├── Parse JSON (webhook body)
    │
    ├── Switch on eventType
    │     ├── "workitem.created"     → 📨 "⚙️ Pipeline started for WI-{id}: {title}"
    │     ├── "workitem.updated"     → 📨 state-specific message (Active/Resolved/Closed/Other)
    │     └── "git.pullrequest.created" → 📨 "🔀 PR raised: {title} — {url}"
    │
    └── Response 200 OK


Flow B: SDLC - ADO Comment Relay
─────────────────────────────────────────────────────────────
HTTP Trigger (ADO webhook)
    │
    ├── Initialize Variables (ADO_ORG, ADO_PROJECT, ADO_TRIGGER_TAG, ADO_ASSIGNEE_EMAIL)
    │
    ├── Parse JSON (webhook body)
    │
    ├── Condition: contains '[TEAMS_INPUT_NEEDED]'?
    │     ├── YES → Extract + Parse payload JSON
    │     │         → Post Adaptive Card (question + options) to {TEAMS_USER_EMAIL}
    │     └── NO  → Post preview: "💬 WI-{id}: {first 200 chars of comment}"
    │
    └── Response 200 OK
```

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Flow doesn't trigger from ADO | Wrong URL pasted in service hook | Verify you copied the URL from the HTTP trigger AFTER saving the flow. Re-copy if needed. |
| Teams message not sent | `{TEAMS_USER_EMAIL}` placeholder not replaced | Edit the "Post message" action and replace `{TEAMS_USER_EMAIL}` with your actual Teams email. |
| Parse JSON fails | ADO payload shape changed | Check the flow Run history, expand the Parse JSON step, view the actual body received. Update schema. |
| Adaptive Card not rendering | Invalid JSON expression | Check the Copilot Studio / flow expression for dynamic content. Use the Peek Code view. |
| `substring` expression errors | Comment text is shorter than 200 chars | The `min(200, length(...))` expression handles this — verify it's entered exactly as shown. |

---

*Last updated: 2026-05-26*
