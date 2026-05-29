# Phase 2 — Power Automate: Create ADO Work Item Flow

**Flow name:** SDLC - Create ADO Work Item  
**Trigger:** When Copilot Studio calls a flow  
**ADO project:** `https://dev.azure.com/nainika-dev/sdlc-agent`  
**Prerequisites:** Power Automate Premium licence (HTTP action is a premium connector) · ADO PAT from `.env`

> **Work item type note:** The URI below uses `$Task` as specified. The existing pipeline
> orchestrator (CLAUDE.md) expects items of type `Feature` or `User Story` to trigger.
> If the orchestrator does not pick up the created item, change `$Task` to `$Feature`
> in the URI (Section 3, Step 3.3). Verify with the orchestrator owner before changing.

---

## Section 1 — Create the Flow

### Step 1.1 — Open Power Automate

1. Navigate to [make.powerautomate.com](https://make.powerautomate.com).
2. In the **top-right environment picker**, confirm the environment matches the Copilot Studio
   environment: **SDLC Bot**. Change it if needed.

### Step 1.2 — Create a new instant cloud flow

1. In the left navigation, click **Create**.
2. On the "Start from blank" row, click **Instant cloud flow**.
3. In the "Build an instant cloud flow" dialog:
   - **Flow name:** `SDLC - Create ADO Work Item`
   - Under "Choose how to trigger this flow", search for `Copilot Studio` in the search box.
   - Select **When Copilot Studio calls a flow** (from the Microsoft Copilot Studio connector).
4. Click **Create**.

   The flow designer opens with the trigger action already added.

---

## Section 2 — Define Input Parameters from Copilot Studio

The trigger action ("When Copilot Studio calls a flow") defines what data Copilot Studio
sends to this flow. You need to add four input parameters — one for each piece of data
collected during intake.

### Step 2.1 — Add RequirementTitle

1. Click on the **When Copilot Studio calls a flow** trigger action to expand it.
2. Click **+ Add an input**.
3. Select **Text** as the input type.
4. Set the input name to: `RequirementTitle`
5. In the description field (optional): `Short title for the requirement`

### Step 2.2 — Add RequirementDescription

1. Click **+ Add an input** again.
2. Select **Text**.
3. Name: `RequirementDescription`
4. Description (optional): `Detailed description of the requirement`

### Step 2.3 — Add AcceptanceCriteria

1. Click **+ Add an input** again.
2. Select **Text**.
3. Name: `AcceptanceCriteria`
4. Description (optional): `Acceptance criteria for completion`

### Step 2.4 — Add Priority

1. Click **+ Add an input** again.
2. Select **Text**.
3. Name: `Priority`
4. Description (optional): `Priority level: Critical, High, Medium, or Low`

After Step 2.4, the trigger block should show four defined inputs:
`RequirementTitle`, `RequirementDescription`, `AcceptanceCriteria`, `Priority`

---

## Section 3 — Add HTTP Action to Create the ADO Work Item

### Step 3.1 — Add an HTTP action

1. Below the trigger, click **+ New step**.
2. In the action search box, type `HTTP`.
3. Select the **HTTP** action (Premium — shows a diamond icon).
   - If prompted about Premium, confirm your licence and continue.

### Step 3.2 — Configure the HTTP action — basic settings

| Setting | Value |
|---------|-------|
| **Action name** (rename by clicking the title) | `HTTP - Create ADO Work Item` |
| **Method** | `POST` |
| **URI** | `https://dev.azure.com/nainika-dev/sdlc-agent/_apis/wit/workitems/$Task?api-version=7.1` |

### Step 3.3 — Configure authentication

1. In the HTTP action, click **Show advanced options**.
2. Set **Authentication** to **Basic**.
3. **Username:** leave this field **empty** (ADO PAT authentication does not require a username).
4. **Password:** enter your ADO Personal Access Token.
   - The PAT must have **Work Items (Read & Write)** scope on the `nainika-dev` organization.
   - To generate one: ADO → User Settings (top-right avatar) → Personal Access Tokens → New Token.
   - **Security note:** Do not type the PAT directly in the flow designer if others have
     access to this environment. Instead, store the PAT in an Azure Key Vault secret and
     reference it via the Azure Key Vault connector's "Get secret" action, then use the
     secret's value as the Password. For Phase 2, direct entry is acceptable for initial setup.

### Step 3.4 — Configure headers

1. In the HTTP action, click **Add new parameter** → **Headers**.
2. Add the following header:

   | Key | Value |
   |-----|-------|
   | `Content-Type` | `application/json-patch+json` |

### Step 3.5 — Configure the request body

1. Click in the **Body** field of the HTTP action.
2. Type or paste the following JSON. For each line that contains a dynamic value,
   click into the correct position and use the **Dynamic content** picker (lightning bolt
   icon or "@" shortcut) to insert the flow input parameter.

   ```
   [
     {
       "op": "add",
       "path": "/fields/System.Title",
       "value": "@{triggerBody()?['RequirementTitle']}"
     },
     {
       "op": "add",
       "path": "/fields/System.Description",
       "value": "<p>@{triggerBody()?['RequirementDescription']}</p><p><strong>Acceptance Criteria:</strong></p><p>@{triggerBody()?['AcceptanceCriteria']}</p>"
     },
     {
       "op": "add",
       "path": "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
       "value": "<p>@{triggerBody()?['AcceptanceCriteria']}</p>"
     },
     {
       "op": "add",
       "path": "/fields/Microsoft.VSTS.Common.Priority",
       "value": @{if(equals(triggerBody()?['Priority'], 'Critical'), 1, if(equals(triggerBody()?['Priority'], 'High'), 1, if(equals(triggerBody()?['Priority'], 'Medium'), 2, 3)))}
     },
     {
       "op": "add",
       "path": "/fields/System.Tags",
       "value": "ai-pipeline-trigger"
     }
   ]
   ```

   > **Priority mapping:** Critical and High both map to ADO priority 1 (Highest).
   > Medium maps to 2. Low maps to 3. The value for Priority is an integer — note there
   > are **no quotes** around the `@{if(...)}` expression on that line.

   > **Entering expressions:** In the Power Automate body field, you can type the `@{...}`
   > syntax directly, or switch to "Code view" (if available) to paste the full JSON at once.
   > After pasting, Power Automate will parse the expressions and highlight them in the UI.

---

## Section 4 — Add Output Variables Back to Copilot Studio

After the HTTP action, you must return data to Copilot Studio so the bot can use the
work item ID and URL in its success message.

### Step 4.1 — Add the "Respond to Copilot Studio" action

1. Below the HTTP action, click **+ New step**.
2. Search for `Respond to Copilot Studio`.
3. Select **Respond to Copilot Studio** (from the Microsoft Copilot Studio connector).
   - This is the companion action to the trigger; it returns data to the bot.

### Step 4.2 — Add WorkItemId output

1. In the Respond action, click **+ Add an output**.
2. Select **Text** as the output type.
3. Output name: `WorkItemId`
4. In the value field, click the **Expression** tab in the dynamic content picker.
5. Enter the expression:
   ```
   string(body('HTTP_-_Create_ADO_Work_Item')?['id'])
   ```
   > This reads the `id` field from the ADO API response body and converts it to text.
   > If you renamed the HTTP action differently, update `'HTTP_-_Create_ADO_Work_Item'`
   > to match your action name (spaces replaced with underscores, special chars with underscores).

### Step 4.3 — Add WorkItemUrl output

1. Click **+ Add an output** again.
2. Select **Text**.
3. Output name: `WorkItemUrl`
4. In the value field, expression tab:
   ```
   body('HTTP_-_Create_ADO_Work_Item')?['_links']?['html']?['href']
   ```
   > This reads the ADO work item's browser URL from the response's `_links.html.href` field.

---

## Section 5 — Error Handling

The HTTP action will throw an error and halt the flow if ADO returns a 4xx or 5xx status
code. To handle this gracefully and send a user-friendly error message back to Copilot
Studio, add a parallel error branch.

### Step 5.1 — Configure "Run after" on the Respond action

1. Hover over the **Respond to Copilot Studio** action.
2. Click the **three dots (...)** menu on the action.
3. Select **Configure run after**.
4. Check only **is successful**.
5. Click **Done**.

   This means the success Respond action only runs when the HTTP action succeeds.

### Step 5.2 — Add an error Respond action

1. In the flow designer, click **+ New step** at the same level as the HTTP action
   (not inside it — you want a parallel branch, or a step after the HTTP action that
   only runs on failure).
2. Alternatively, select the **Parallel branch** option to create a true parallel path.

   **Simpler approach using a scope:**

   1. Click **+ New step** → search for `Scope`.
   2. Select **Scope** (Control connector).
   3. Move the HTTP action **inside** the Scope by dragging it, or recreate it inside the scope.
   4. After the Scope, add a **Condition** action:
      - Click **+ New step** → **Condition**.
      - Left side: select **outputs('Scope')** then look for **result** or status.
      - Or: use `result('Scope')?[0]?['status']`
      - **Condition:** `is equal to` → `Succeeded`
   5. **Yes branch:** Add the **Respond to Copilot Studio** (success) action from Steps 4.1–4.3.
   6. **No branch:** Add another **Respond to Copilot Studio** action for the error case.

### Step 5.3 — Configure the error Respond action

In the **No** (failure) branch of the condition:

1. Add **Respond to Copilot Studio**.
2. Add a **Text** output named `WorkItemId` with value: `ERROR`
3. Add a **Text** output named `WorkItemUrl` with value: *(leave empty)*
4. Add a **Text** output named `ErrorMessage` with value:
   ```
   Failed to create the work item. Please try again or create it manually in ADO.
   ```

### Step 5.4 — Handle the error in Copilot Studio

Back in Copilot Studio (see Section 3.11 of the Copilot Studio setup guide), the
condition `Topic.WorkItemId is not blank` and `does not equal ERROR` covers the failure
case. The bot's False branch sends the error message to the user.

---

## Section 6 — Connect the Flow to Copilot Studio

After saving the Power Automate flow, return to Copilot Studio to wire it into the
Intake topic.

### Step 6.1 — Save the flow in Power Automate

1. Click **Save** in the top-right of the Power Automate designer.
2. Wait for the green "Your flow is ready" confirmation.
3. Note the flow name: **SDLC - Create ADO Work Item**.

### Step 6.2 — Add the Power Automate action in Copilot Studio

1. Open **Copilot Studio** → **Topics** → **Requirement Intake**.
2. Find the node position in the True branch after the confirmation condition
   (Step 3.10 of the Copilot Studio guide).
3. Click **+** → **Call an action**.
4. Select **Run a flow from Power Automate**.
5. In the flow picker, find and select **SDLC - Create ADO Work Item**.
   - If the flow does not appear, click **Refresh** or wait 1–2 minutes for it to sync.

### Step 6.3 — Map Copilot Studio variables to flow inputs

In the action configuration panel, each flow input appears as a field to fill in.
Use the **Insert variable** option (or type `{` to open the variable picker) to map:

| Flow Input | Copilot Studio Variable |
|-----------|------------------------|
| RequirementTitle | `Topic.RequirementTitle` |
| RequirementDescription | `Topic.RequirementDescription` |
| AcceptanceCriteria | `Topic.AcceptanceCriteria` |
| Priority | `Topic.Priority` |

### Step 6.4 — Map flow outputs to Copilot Studio variables

Below the input mappings, the action shows the flow's output parameters.
For each output, click the variable dropdown and either create a new variable or
select an existing one:

| Flow Output | Create as Copilot Studio variable |
|------------|----------------------------------|
| WorkItemId | `Topic.WorkItemId` (Text) |
| WorkItemUrl | `Topic.WorkItemUrl` (Text) |

### Step 6.5 — Use WorkItemId and WorkItemUrl in the success message

After the Power Automate action node, the bot sends the WI Created Success Adaptive Card
(see Copilot Studio guide Section 3.12). The card JSON references `${Topic.WorkItemId}`
and `${Topic.WorkItemUrl}` to display the created item's ID and link.

If the card's URL action (`Action.OpenUrl`) does not support variable substitution in your
version, add a plain text message after the card:

```
Work item WI-@{Topic.WorkItemId} has been created.
View it here: @{Topic.WorkItemUrl}
```

---

## Section 7 — End-to-End Test

Run this checklist after both the Copilot Studio setup and the Power Automate flow are complete.

### Step 7.1 — Test in Copilot Studio test panel

1. Open the Copilot Studio **Test** panel.
2. Run the full intake conversation (Greeting → Intake → Confirm).
3. After clicking "Confirm & Submit", wait up to 30 seconds for the Power Automate flow to run.
4. Verify:
   - [ ] The WI Created Success card appears with a non-zero WI ID
   - [ ] The "View in ADO" link in the card opens the correct work item
   - [ ] The bot sends the follow-up message "The pipeline is now running..."

### Step 7.2 — Verify in Power Automate run history

1. Navigate to [make.powerautomate.com](https://make.powerautomate.com).
2. Click **My flows** → find **SDLC - Create ADO Work Item**.
3. Click the flow name → click **Run history** (right panel or within the flow page).
4. Find the most recent run and click it.
5. Verify:
   - [ ] All four input parameters show the values entered during the Copilot Studio test
   - [ ] The HTTP action shows status code **200** or **201**
   - [ ] The HTTP action's output body contains an `id` field with a numeric work item ID
   - [ ] The Respond action shows `WorkItemId` and `WorkItemUrl` as outputs

### Step 7.3 — Verify in Azure DevOps

1. Navigate to `https://dev.azure.com/nainika-dev/sdlc-agent`.
2. Go to **Boards** → **Work Items** (or use the URL:
   `https://dev.azure.com/nainika-dev/sdlc-agent/_workitems`).
3. Find the newly created work item. Verify:
   - [ ] **Title** matches what was entered in the intake form
   - [ ] **Tags** field contains `ai-pipeline-trigger`
   - [ ] **Description** contains the description text
   - [ ] **Acceptance Criteria** field is populated
   - [ ] **Priority** is set to the correct numeric value (1 for Critical/High, 2 for Medium, 3 for Low)
   - [ ] **State** is `New`

### Step 7.4 — Verify the pipeline picks it up

If the pipeline orchestrator is running:
1. Wait up to 60 seconds (the orchestrator polls every 60 s).
2. Check the ADO work item — state should change from `New` to `Active`.
3. The pipeline has picked up the item. Phase 2 integration is working end-to-end.
