# Phase 3 Build Guide: Activate Check Status Topic

## Overview

This guide adds a "Check Status" feature to the `SDLC Pipeline Bot`. The user can ask
the bot for the current state of any work item by number, and the bot calls a Power
Automate flow to fetch the live status from Azure DevOps.

**Two parts:**
1. Build the `SDLC - Get WI Status` Power Automate flow (HTTP GET to ADO REST API)
2. Activate the Check Status topic in Copilot Studio to wire the bot to the flow

**Placeholders used in this guide:**

| Placeholder | Replace With |
|---|---|
| `{ADO_ORG}` | Your Azure DevOps organization name |
| `{ADO_PROJECT}` | Your Azure DevOps project name |
| `{ADO_PAT}` | Your ADO Personal Access Token (Work Items Read scope) |
| `{ADO_TRIGGER_TAG}` | Your pipeline trigger tag |
| `{ADO_ASSIGNEE_EMAIL}` | Assignee email for config completeness |

---

# Part 1: Build the SDLC - Get WI Status Flow

## Section 1: Create the Flow

1. Open **Power Automate** (`https://make.powerautomate.com`)
2. Top right: select the **SDLC Bot** environment
3. Left sidebar: **+ Create** → **Instant cloud flow**
4. Name: `SDLC - Get WI Status`
5. Trigger: **When Copilot Studio calls a flow** (also listed as "When Power Virtual Agents calls a flow")
   - Search for `Power Virtual Agents` or `Copilot Studio` in the trigger list
6. Click **Create**

The flow editor opens with the Copilot Studio trigger at the top.

---

## Section 2: Initialize Config Variables

Add four **Initialize variable** actions immediately after the trigger.

**Action 1 — ADO_ORG**
- Name: `ADO_ORG`
- Type: String
- Value: `{ADO_ORG}` ← replace with your org name

**Action 2 — ADO_PROJECT**
- Name: `ADO_PROJECT`
- Type: String
- Value: `{ADO_PROJECT}` ← replace with your project name

**Action 3 — ADO_TRIGGER_TAG**
- Name: `ADO_TRIGGER_TAG`
- Type: String
- Value: `{ADO_TRIGGER_TAG}` ← replace with your trigger tag

**Action 4 — ADO_ASSIGNEE_EMAIL**
- Name: `ADO_ASSIGNEE_EMAIL`
- Type: String
- Value: `{ADO_ASSIGNEE_EMAIL}` ← replace with assignee email

---

## Section 3: Define the Flow Input

The Copilot Studio trigger supports input parameters.

1. Click the **When Copilot Studio calls a flow** trigger card to expand it
2. Under **Input**, click **+ Add an input**
3. Select **Text**
4. Name: `WorkItemId`
5. Description: `The Azure DevOps work item number to look up`

This creates a `WorkItemId` parameter that Copilot Studio passes when calling the flow.

---

## Section 4: HTTP GET to ADO Work Item API

1. Click **+ New step**
2. Search: `HTTP`
3. Action: **HTTP** (the generic HTTP action, under Premium connectors)
4. Configure:
   - **Method:** GET
   - **URI:**
     ```
     https://dev.azure.com/@{variables('ADO_ORG')}/@{variables('ADO_PROJECT')}/_apis/wit/workitems/@{triggerBody()?['text']}?api-version=7.1
     ```
     _(The `@{triggerBody()?['text']}` expression reads the `WorkItemId` input from Copilot Studio)_
   - **Headers:** click **+ Add new item**:
     - **Key:** `Content-Type`
     - **Value:** `application/json`
   - **Authentication:** select `Basic`
     - **Username:** leave blank (or enter any value — ADO ignores it with PAT auth)
     - **Password:** `{ADO_PAT}` ← replace with your actual Personal Access Token
       _(Enter the raw PAT value only — no prefix, no newlines)_
5. Click **Done**

**Note:** The HTTP action is a Premium connector and requires a Power Automate plan that
includes Premium connectors (e.g., Power Automate per-user plan).

---

## Section 5: Parse the ADO Response

1. Click **+ New step**
2. Action: **Parse JSON**
3. Configure:
   - **Content:** `@body('HTTP')`
   - **Schema:** paste the schema below

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "fields": {
      "type": "object",
      "properties": {
        "System.Title": { "type": "string" },
        "System.State": { "type": "string" },
        "System.AssignedTo": {
          "type": "object",
          "properties": {
            "displayName": { "type": "string" }
          }
        },
        "System.TeamProject": { "type": "string" }
      }
    },
    "_links": {
      "type": "object",
      "properties": {
        "html": {
          "type": "object",
          "properties": {
            "href": { "type": "string" }
          }
        }
      }
    }
  }
}
```

**Key extraction expressions:**

| Output | Expression |
|---|---|
| Work item ID | `@body('Parse_JSON')?['id']` |
| Title | `@body('Parse_JSON')?['fields']?['System.Title']` |
| State | `@body('Parse_JSON')?['fields']?['System.State']` |
| Assigned To | `@body('Parse_JSON')?['fields']?['System.AssignedTo']?['displayName']` |
| Web URL | `@body('Parse_JSON')?['_links']?['html']?['href']` |

---

## Section 6: Return Data to Copilot Studio

1. Click **+ New step**
2. Search: `Respond to`
3. Action: **Respond to the bot or flow** (listed under Copilot Studio / Power Virtual Agents)
4. Click **+ Add an output** for each value:

**Output 1 — WITitle**
- Type: Text
- Name: `WITitle`
- Value: `@{body('Parse_JSON')?['fields']?['System.Title']}`

**Output 2 — WIState**
- Type: Text
- Name: `WIState`
- Value: `@{body('Parse_JSON')?['fields']?['System.State']}`

**Output 3 — WIAssignedTo**
- Type: Text
- Name: `WIAssignedTo`
- Value: `@{body('Parse_JSON')?['fields']?['System.AssignedTo']?['displayName']}`

**Output 4 — WIUrl**
- Type: Text
- Name: `WIUrl`
- Value: `@{body('Parse_JSON')?['_links']?['html']?['href']}`

5. Click **Done**
6. Click **Save**

---

## Flow Diagram

```
Copilot Studio calls flow (WorkItemId as input)
        │
        ├── Initialize Variables (ADO_ORG, ADO_PROJECT, ADO_TRIGGER_TAG, ADO_ASSIGNEE_EMAIL)
        │
        ├── HTTP GET
        │     https://dev.azure.com/{ADO_ORG}/{ADO_PROJECT}/_apis/wit/workitems/{WorkItemId}
        │     Auth: Basic {ADO_PAT}
        │
        ├── Parse JSON (extract id, title, state, assignedTo, url)
        │
        └── Return to Copilot Studio: WITitle, WIState, WIAssignedTo, WIUrl
```

---

---

# Part 2: Activate the Check Status Topic in Copilot Studio

## Section 7: Open the Existing Check Status Topic

The bot has a `CheckStatus` topic created as a placeholder. Activate it by replacing
the placeholder message with working nodes.

1. Open **Copilot Studio** (`https://copilotstudio.microsoft.com`)
2. Switch to the **SDLC Bot** environment
3. Open `SDLC Pipeline Bot`
4. Left sidebar: click **Topics**
5. Find `CheckStatus` (or create it if it doesn't exist — see Section 7a below)
6. Click to open the topic in the editor

### 7a: Creating the Topic (if it doesn't exist)

1. Click **+ New topic**
2. Name: `CheckStatus`
3. Description: `Looks up the current state of an ADO work item by number`
4. **Trigger phrases** — add these so the user can start this topic:
   - `check status`
   - `what's the status`
   - `status of work item`
   - `pipeline progress`
   - `WI status`

---

## Section 8: Remove the Placeholder Message

If there is an existing placeholder message node (e.g., "Status check coming soon..."):

1. Click the placeholder message node
2. Click the **...** menu on the node
3. Click **Delete**

---

## Section 9: Add Question Node

1. Click **+ Add node** → **Ask a question**
2. Question text:
   ```
   Which work item number would you like to check?
   (e.g., enter "42" for WI-42)
   ```
3. **Save response as:** `WorkItemNumber`
4. **Variable type:** String
5. **Input type:** User's entire response

---

## Section 10: Add Action Node — Call the Flow

1. Click **+ Add node** → **Call an action**
2. Select **SDLC - Get WI Status** from the flow list
   _(If it doesn't appear, ensure the flow is saved and in the same SDLC Bot environment)_
3. Configure the input:
   - **WorkItemId:** select `WorkItemNumber` (the variable from Section 9)
4. Click **Done**

The action node now exposes four output variables from the flow:
- `WITitle`
- `WIState`
- `WIAssignedTo`
- `WIUrl`

---

## Section 11: Add Message Node — Show Results

1. Click **+ Add node** → **Message**
2. Enter the message text, inserting the output variables using the variable picker:

```
📋 WI-{WorkItemNumber}: {WITitle}
State: {WIState}
Assigned to: {WIAssignedTo}
🔗 {WIUrl}
```

_(In Copilot Studio, click the `{x}` icon or `+` to insert variables — pick `WorkItemNumber`, `WITitle`, `WIState`, `WIAssignedTo`, and `WIUrl` from the list)_

---

## Section 12: Add Error Handling

If the work item doesn't exist (ADO returns a 404), the flow outputs will be empty.
Add a Condition node before the message to handle this gracefully.

1. After the Action node (Section 10), click **+ Add node** → **Add a condition**
2. Condition: `WITitle` **is** (empty / blank)
   _(In Copilot Studio, use "Is equal to" with an empty string, or check for `is blank`)_

**If condition is TRUE (empty title — work item not found):**

1. Add a **Message** node:
   ```
   ❌ Work item not found. Please check the number and try again.
   ```
2. Add a **Go to step** to redirect back to the question (Section 9) or end the topic

**If condition is FALSE (title found — work item exists):**

1. Continue to the message node from Section 11

---

## Section 13: Publish the Bot

After activating the topic:

1. Top right: click **Publish**
2. Review the topic changes
3. Click **Publish** to confirm
4. Wait 1–2 minutes

The Check Status feature is now live in Teams. Users can type "check status" to trigger it.

---

## Testing the Feature

### In Copilot Studio (Local Test)

1. Open the **Test bot** panel (top right)
2. Type: `check status`
3. Bot should ask: "Which work item number would you like to check?"
4. Type a valid work item ID (e.g., `42`)
5. Bot should return the title, state, assigned-to, and URL

### In Teams

1. Open Teams → find `SDLC Pipeline Bot`
2. Type: `what's the status of my work item`
3. Answer with a work item number
4. Verify the bot returns live ADO data

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Flow doesn't appear in the Call an action list | Flow not saved, or in wrong environment | Save the flow. Verify it's in the SDLC Bot environment. Reload Copilot Studio. |
| HTTP 401 error from ADO | Invalid or expired `{ADO_PAT}` | Regenerate the PAT in ADO (User Settings → Personal Access Tokens). Update the flow. |
| HTTP 404 from ADO | Work item ID doesn't exist in `{ADO_PROJECT}` | Verify the user entered the correct ID. Check the project name in the ADO_PROJECT variable. |
| Output variables empty in bot message | Flow outputs are lowercase | Check if output variable names are `wititile`, `wistate`, etc. (Copilot Studio lowercases them). Update the message node to use the lowercased names. |
| "Work item not found" for a valid ID | ADO_ORG or ADO_PROJECT variable is wrong | Check the Initialize Variable values in the flow. Test the HTTP action manually in Power Automate. |

---

*Last updated: 2026-05-26*
