# Phase 2 Build Guide: Power Automate Flow

## Overview

This guide walks through building the `SDLC - Create ADO Work Item` flow in Power Automate.
The flow receives a requirement from Copilot Studio, creates an ADO work item with
the correct tag, and returns the work item ID to the bot.

---

## Prerequisites

- Power Automate access in the **SDLC Bot** environment (created in teams/SETUP.md)
- ADO Personal Access Token (`{ADO_PAT}`) with Work Items R/W scope
- Azure DevOps organization (`{ADO_ORG}`) and project (`{ADO_PROJECT}`)
- Email address to assign work items to (`{ADO_ASSIGNEE_EMAIL}`)
- ADO trigger tag value (`{ADO_TRIGGER_TAG}`, default: `ai-pipeline-trigger`)

---

## Section 1: Create the Flow

1. Open **Power Automate** (`https://make.powerautomate.com`)
2. Top right: select the **SDLC Bot** environment (the one created in SETUP.md)
3. Left sidebar: click **+ Create**
4. Select **Cloud flow** → **Automated cloud flow**
5. Name: `SDLC - Create ADO Work Item`
6. Trigger: search and select **HTTP request** (When an HTTP request is received)
7. Click **Create**

The flow editor opens. You now have an HTTP trigger at the top.

---

## Section 2: Add Configuration Variables

Configuration values are stored as flow variables so they can be updated without
editing the flow logic. Add these four **Initialize variable** actions after the
HTTP trigger.

### 2.1: ADO Organization Variable

1. Click **+ New step** (below the HTTP trigger)
2. Search: `Initialize variable`
3. Select **Initialize variable** (by Microsoft)
4. Configure:
   - **Name:** `ADO_ORG`
   - **Type:** String
   - **Value:** `{ADO_ORG}` — replace with your actual ADO org name (e.g., `myorg` from `dev.azure.com/myorg`)
5. Click **Done**

### 2.2: ADO Project Variable

1. Click **+ New step**
2. Search: `Initialize variable`
3. Configure:
   - **Name:** `ADO_PROJECT`
   - **Type:** String
   - **Value:** `{ADO_PROJECT}` — replace with your ADO project name
4. Click **Done**

### 2.3: Assignee Email Variable

1. Click **+ New step**
2. Search: `Initialize variable`
3. Configure:
   - **Name:** `ADO_ASSIGNEE_EMAIL`
   - **Type:** String
   - **Value:** `{ADO_ASSIGNEE_EMAIL}` — replace with the email to assign work items to
4. Click **Done**

### 2.4: Trigger Tag Variable

1. Click **+ New step**
2. Search: `Initialize variable`
3. Configure:
   - **Name:** `ADO_TRIGGER_TAG`
   - **Type:** String
   - **Value:** `{ADO_TRIGGER_TAG}` — replace with your trigger tag (default: `ai-pipeline-trigger`)
5. Click **Done**

### 2.5: Config-Driven Architecture

The four variables above allow you to **update configuration without modifying the
flow itself**. When you update these values, the flow automatically uses the new values
on the next execution.

In subsequent steps, reference these variables using the syntax:
```
@variables('ADO_ORG')
@variables('ADO_PROJECT')
@variables('ADO_ASSIGNEE_EMAIL')
@variables('ADO_TRIGGER_TAG')
```

---

## Section 3: Parse the Request Body

The HTTP trigger receives JSON from Copilot Studio with the user's input. Parse it
to extract title, description, and type.

1. Click **+ New step**
2. Search: `Parse JSON`
3. Select **Parse JSON** (by Microsoft)
4. Configure:
   - **Content:** select the **Body** output from the HTTP trigger
   - **Schema:** paste the schema below:

```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "description": { "type": "string" },
    "type": { "type": "string" }
  }
}
```

5. Click **Done**

---

## Section 4: Create the ADO Work Item

Now call the Azure DevOps connector to create a work item.

1. Click **+ New step**
2. Search: `Azure DevOps`
3. Select **Create a work item** (by Azure DevOps)
4. Configure:
   - **Organization:** `@variables('ADO_ORG')`
   - **Project:** `@variables('ADO_PROJECT')`
   - **Work Item Type:** `User Story` (or `Feature` — both trigger the pipeline)
   - **Title:** `@body('Parse_JSON')?['title']`
   - **Description:** `@body('Parse_JSON')?['description']`
   - **Assigned To:** `@variables('ADO_ASSIGNEE_EMAIL')`
   - **Tags:** `@variables('ADO_TRIGGER_TAG')` (must match the pipeline orchestrator's trigger tag)
   - **State:** `New`

5. Click **Done**

**Note:** The Tags field accepts a single tag as a string. If you need multiple tags,
use semicolon-delimited format: `tag1;tag2`.

---

## Section 5: Return the Work Item ID

The bot needs confirmation that the work item was created. Return the work item ID
and URL.

1. Click **+ New step**
2. Search: `Response`
3. Select **Response** (by Microsoft)
4. Configure:
   - **Status Code:** `200`
   - **Body:** paste the JSON below:

```json
{
  "workItemId": @outputs('Create_a_work_item')?['body']?['id'],
  "message": "Work item created successfully"
}
```

5. Click **Done**

---

## Section 6: Authentication

The Azure DevOps connector requires authentication. When you add the **Create a work
item** action, Power Automate prompts you to sign in or provide credentials.

**If prompted for PAT (Personal Access Token):**
- Enter the raw token value: `{ADO_PAT}`
- Do NOT include any prefix (like `PAT:` or `Basic`)
- Do NOT include newlines
- The token must have Work Items R/W scope

**If prompted for sign-in:**
- Sign in with an account that has ADO access
- Power Automate securely stores the connection

---

## Section 7: Test the Flow

1. Top right: click **Save**
2. Top left: click **← Back to cloud flows**
3. Find `SDLC - Create ADO Work Item` in the list
4. Click the **...** menu → **Test**
5. Select **Manually trigger a flow**
6. Click **Test**
7. Provide a sample JSON request body:

```json
{
  "title": "Add dark mode toggle",
  "description": "Allow users to switch between light and dark theme",
  "type": "Feature"
}
```

8. Click **Run flow**
9. Check Azure DevOps (`dev.azure.com/{ADO_ORG}/{ADO_PROJECT}`) — a new work item should appear

---

## Section 8: Get the HTTP Endpoint URL

After testing, you'll provide this flow's HTTP endpoint to Copilot Studio. The bot
calls this URL to trigger the flow.

1. Open the flow in edit mode
2. Click the **HTTP trigger** card
3. Copy the entire URL from the **HTTP POST URL** field (it looks like `https://prod-xx.region.logic.azure.com/workflows/...`)
4. Save this URL — you'll paste it into Copilot Studio in the next guide

---

## Known Issues & Solutions

| Issue | Cause | Solution |
|---|---|---|
| Create a work item action fails | Invalid ADO_PAT or wrong org/project | Verify variables are set correctly. Test ADO_PAT in ADO UI. |
| Response action fails | Output path is incorrect | Verify output name matches the action name (e.g., `Create_a_work_item`). |
| Flow times out | Network or connector issue | Check Power Automate status page. Retry the flow. |
| Work item created but no tags | Tags field is empty | Verify `ADO_TRIGGER_TAG` variable is set and non-empty. |

---

## Flow Diagram

```
HTTP Request (from Copilot Studio)
        │
        ▼
Initialize Variables (ADO_ORG, ADO_PROJECT, ADO_ASSIGNEE_EMAIL, ADO_TRIGGER_TAG)
        │
        ▼
Parse JSON (extract title, description, type from request body)
        │
        ▼
Create a work item (ADO) — use variables in all fields
        │
        ▼
Response (return work item ID and success message)
```

---

## Environment Note

This flow **must be created in the same Power Automate environment as Copilot Studio**
(SDLC Bot environment). Copilot Studio looks for flows in its own environment. If
you create the flow in a different environment, the bot won't find it.

---

*Last updated: 2026-05-26*
