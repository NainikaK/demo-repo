# Phase 2 — Copilot Studio: Building the SDLC Pipeline Bot

**Platform:** Microsoft Copilot Studio (Teams-embedded)  
**Environment:** SDLC Bot  
**Prerequisites:** Access to copilotstudio.microsoft.com · Power Automate · Azure DevOps `nainika-dev/sdlc-agent`

---

## Section 1 — Create the Agent

### Step 1.1 — Open Copilot Studio in the correct environment

1. Navigate to [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com).
2. In the **top-right corner**, click the environment name (shown next to your user avatar).
3. From the environment picker, select **SDLC Bot**.
   - If the environment does not appear, ask your Microsoft 365 admin to grant you Maker access to it.

### Step 1.2 — Create a blank agent

1. In the left navigation panel, click **Create**.
2. On the "Create an agent" screen, click **Skip to configure** (bottom of the screen).
   - This bypasses the AI-assisted setup and takes you directly to the configuration form.
3. Fill in the following fields:

   | Field | Value |
   |-------|-------|
   | **Name** | `SDLC Pipeline Bot` |
   | **Description** | `Receives software requirements from users, creates Azure DevOps work items, and keeps users informed of pipeline progress` |
   | **Language** | English |

4. In the **Instructions** field, paste the following system prompt in full:

   ```
   You are the SDLC Pipeline Bot, the interface between software teams and an automated
   AI development pipeline. Your role is to help users submit new feature requirements,
   track the progress of pipeline runs, and respond to pipeline questions when they arise.

   ## What you do
   - Guide users through a structured intake conversation to collect requirement details
   - Create Azure DevOps work items on the user's behalf after they confirm their input
   - Inform users about the status of their pipeline work items when asked
   - Send placeholder messages for features not yet available (abort, retry)

   ## What you do NOT do
   - You do not modify pipeline behavior or agent logic
   - You do not answer general software development questions
   - You do not engage in conversation outside of pipeline intake and status topics
   - You do not expose internal pipeline details, agent names, or system architecture

   ## Tone
   - Professional and concise. One or two sentences per response.
   - No emoji in plain text messages.
   - No filler phrases ("Great!", "Sure thing!", "Of course!").
   - Always reference the work item ID (WI-{id}) in any message that involves a specific item.

   ## When a user says something unrelated
   Respond with:
   "I can help you submit a new feature requirement or check the status of an existing one.
   To start a new request, describe the feature you want to build.
   To check status, type: status WI-{id}"

   ## Phase availability
   - Phase 2 (now): Intake only — you can collect requirements and create ADO work items.
   - Phase 3 (upcoming): Status queries and pipeline notifications.
   - Phase 4 (upcoming): Human-in-the-loop clarification responses.
   ```

5. Leave all other settings at their defaults.
6. Click **Create** (top-right button).

   Copilot Studio creates the agent and opens the agent canvas.

---

## Section 2 — Create the Greeting Topic

### Step 2.1 — Edit the existing Greeting system topic

1. In the left navigation, click **Topics**.
2. At the top of the Topics list, click the **System** tab to view system topics.
3. Click on **Greeting** to open it.

### Step 2.2 — Replace the trigger phrases

1. In the Greeting topic canvas, click the **Trigger** node at the top.
2. In the right-hand panel under **Phrases**, delete all existing phrases.
3. Add the following phrases one at a time (press Enter after each):
   - `hi`
   - `hello`
   - `hey`
   - `start`
   - `new requirement`
   - `I have a requirement`
   - `get started`
   - `help`

### Step 2.3 — Replace the bot message

1. Click the existing **Message** node in the topic canvas.
2. Delete all existing message content.
3. Paste the following message:

   ```
   Hello! I'm the SDLC Pipeline Bot.

   I can help you submit a new software feature for automated development.
   Once you submit, an AI pipeline will handle requirements analysis,
   design, coding, testing, and code review — and keep you updated along the way.

   To get started, describe the feature you'd like to build.
   For example: "Add a dark/light mode toggle to the app"
   ```

4. Click **Save** (top-right of the topic canvas).

---

## Section 3 — Create the Requirement Intake Topic

### Step 3.1 — Create a new topic

1. In the left navigation, click **Topics**.
2. Click **Add a topic** → **From blank**.
3. At the top of the canvas, click the topic name ("Untitled") and rename it to:
   `Requirement Intake`
4. Click **Save**.

### Step 3.2 — Add trigger phrases

1. Click the **Trigger** node.
2. In the right-hand panel, add the following phrases one at a time:
   - `I want to add`
   - `I need`
   - `build`
   - `create a feature`
   - `new feature`
   - `add a feature`
   - `the requirement is`
   - `I have a new requirement`
   - `implement`
   - `we need to`
   - `I'd like to`

### Step 3.3 — Add Question node: RequirementTitle

1. Click **+** below the Trigger node.
2. Select **Ask a question**.
3. In the right-hand panel:
   - **Question text:** `What's a short title for this requirement? (e.g. "Dark/Light Mode Toggle")`
   - **Identify:** Select **User's entire response**
   - **Save response as:** Click the variable name field and type `RequirementTitle`
   - Confirm the variable type is **Text**.

### Step 3.4 — Add Question node: RequirementDescription

1. Click **+** below the RequirementTitle question node.
2. Select **Ask a question**.
3. In the right-hand panel:
   - **Question text:** `Describe the requirement in detail. What should it do, who is it for, and what problem does it solve?`
   - **Identify:** Select **User's entire response**
   - **Save response as:** `RequirementDescription`
   - Variable type: **Text**.

### Step 3.5 — Add Question node: AcceptanceCriteria

1. Click **+** below the RequirementDescription question node.
2. Select **Ask a question**.
3. In the right-hand panel:
   - **Question text:** `What are the acceptance criteria? List the conditions that must be true for this feature to be considered complete. Use numbered points or Given/When/Then format.`
   - **Identify:** Select **User's entire response**
   - **Save response as:** `AcceptanceCriteria`
   - Variable type: **Text**.

### Step 3.6 — Add Question node: Priority

1. Click **+** below the AcceptanceCriteria question node.
2. Select **Ask a question**.
3. In the right-hand panel:
   - **Question text:** `What is the priority of this requirement?`
   - **Identify:** Select **Multiple choice options**
   - Add the following options (one per line):
     - `Critical`
     - `High`
     - `Medium`
     - `Low`
   - **Save response as:** `Priority`
   - Variable type: **Text** (or **Choice** — Copilot Studio may auto-set this).

### Step 3.7 — Add the Requirement Confirmation Adaptive Card

After all four questions are collected, send the confirmation card.

1. Click **+** below the Priority question node.
2. Select **Send a message**.
3. In the message editor, click **Add** → **Adaptive Card**.
4. In the card editor that opens, click **Edit JSON**.
5. Delete all existing content in the JSON editor.
6. Paste the following JSON (the full card JSON is in
   [`phase2-adaptive-card-json.md`](phase2-adaptive-card-json.md) — Card 1):

   ```json
   {
     "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
     "type": "AdaptiveCard",
     "version": "1.4",
     "body": [
       {
         "type": "TextBlock",
         "text": "Confirm Your Feature Request",
         "weight": "Bolder",
         "size": "Large",
         "wrap": true,
         "color": "Accent"
       },
       {
         "type": "FactSet",
         "facts": [
           { "title": "Title", "value": "${Topic.RequirementTitle}" },
           { "title": "Priority", "value": "${Topic.Priority}" }
         ]
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
         "wrap": true
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
         "wrap": true
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
         "data": { "confirm": true },
         "style": "positive"
       },
       {
         "type": "Action.Submit",
         "title": "Edit",
         "data": { "confirm": false }
       }
     ]
   }
   ```

   > **Variable substitution:** The `${Topic.RequirementTitle}` tokens in the JSON are
   > replaced at render time by Copilot Studio with the values of the corresponding topic
   > variables. If your version of Copilot Studio does not support this syntax, see the
   > "Alternative: Compose card via formula" note at the end of this section.

7. Click **Done** or **OK** to close the card editor.
8. Click **Save** on the topic.

### Step 3.8 — Add a Question node to capture the card response

After the card is sent, capture the user's action (Confirm or Edit).

1. Click **+** below the Adaptive Card message node.
2. Select **Ask a question**.
3. In the right-hand panel:
   - **Question text:** *(leave blank — the card above already presents the question)*
   - **Identify:** Select **User's entire response**
   - **Save response as:** `ConfirmationResponse`
   - Variable type: **Text**

   > Copilot Studio will capture the JSON data submitted by the Adaptive Card's
   > `Action.Submit` into this variable. The value will contain either
   > `{"confirm":true}` or `{"confirm":false}`.

### Step 3.9 — Add a Condition node: branch on Confirm vs Edit

1. Click **+** below the ConfirmationResponse question node.
2. Select **Add a condition**.
3. Configure the condition:
   - **Variable:** `Topic.ConfirmationResponse`
   - **Condition:** `contains`
   - **Value:** `"confirm":true`
4. This creates two branches: **True** (user confirmed) and **False** (user wants to edit).

**False branch (Edit path):**
1. On the **False** branch, click **+**.
2. Select **Redirect to another topic**.
3. Select **Requirement Intake** (this topic) — this restarts the intake from the top.

**True branch (Confirm path):** continues in the next step.

### Step 3.10 — Add the Power Automate action (True branch)

1. In the **True** branch, click **+**.
2. Select **Call an action** → **Create a flow** → this will open Power Automate.
   - At this point, switch to File 2 ([`phase2-power-automate-flow.md`](phase2-power-automate-flow.md))
     and build the Power Automate flow first, then return here to connect it.
3. After the flow is built and saved in Power Automate, come back to Copilot Studio.
4. Click **+** in the True branch.
5. Select **Call an action** → **Run a flow from Power Automate**.
6. In the flow picker, find and select **SDLC - Create ADO Work Item**.
7. In the action configuration panel, map inputs:

   | Flow input parameter | Copilot Studio variable |
   |---------------------|------------------------|
   | RequirementTitle | `Topic.RequirementTitle` |
   | RequirementDescription | `Topic.RequirementDescription` |
   | AcceptanceCriteria | `Topic.AcceptanceCriteria` |
   | Priority | `Topic.Priority` |

8. Map outputs from the flow to new topic variables:

   | Flow output | Variable name | Type |
   |------------|--------------|------|
   | WorkItemId | `WorkItemId` | Text |
   | WorkItemUrl | `WorkItemUrl` | Text |

### Step 3.11 — Add error condition

1. Click **+** below the Power Automate action node.
2. Select **Add a condition**.
3. Configure:
   - **Variable:** `Topic.WorkItemId`
   - **Condition:** `is not blank`

**False branch (creation failed):**
1. Add a **Send a message** node.
2. Message text:
   ```
   I wasn't able to create the work item right now. Please try again in a few minutes,
   or create it manually in ADO and add the tag "ai-pipeline-trigger".
   ```
3. Add an **End conversation** node.

**True branch (success):** continues below.

### Step 3.12 — Add success message and WI Created card (True branch)

1. In the **True** (creation succeeded) branch, click **+**.
2. Select **Send a message**.
3. In the message editor, click **Add** → **Adaptive Card**.
4. Click **Edit JSON** and paste the WI Created Success Card JSON from
   [`phase2-adaptive-card-json.md`](phase2-adaptive-card-json.md) — Card 2.
5. After the card node, add another **Send a message** node:
   ```
   The pipeline is now running. You'll receive updates as it progresses.
   ```
6. Add an **End conversation** node.
7. Click **Save** on the topic.

---

> **Alternative: Compose card via formula (if `${Topic.X}` syntax is not supported)**
>
> If your Copilot Studio version does not support `${Topic.VariableName}` in card JSON:
> 1. Before the Message node, add a **Set variable** node.
> 2. Set variable name: `ConfirmationCardJson` (Text).
> 3. In the Value field, use the **Formula** editor and write:
>    ```
>    Concat(
>      "{\"$schema\":\"http://adaptivecards.io/schemas/adaptive-card.json\",\"type\":\"AdaptiveCard\",\"version\":\"1.4\",\"body\":[{\"type\":\"TextBlock\",\"text\":\"Confirm Your Feature Request\",\"weight\":\"Bolder\",\"size\":\"Large\"},{\"type\":\"FactSet\",\"facts\":[{\"title\":\"Title\",\"value\":\"",
>      Topic.RequirementTitle,
>      "\"},{\"title\":\"Priority\",\"value\":\"",
>      Topic.Priority,
>      "\"}]},{\"type\":\"TextBlock\",\"text\":\"Description\",\"weight\":\"Bolder\"},{\"type\":\"TextBlock\",\"text\":\"",
>      Topic.RequirementDescription,
>      "\",\"wrap\":true},{\"type\":\"TextBlock\",\"text\":\"Acceptance Criteria\",\"weight\":\"Bolder\"},{\"type\":\"TextBlock\",\"text\":\"",
>      Topic.AcceptanceCriteria,
>      "\",\"wrap\":true}],\"actions\":[{\"type\":\"Action.Submit\",\"title\":\"Confirm & Submit\",\"data\":{\"confirm\":true},\"style\":\"positive\"},{\"type\":\"Action.Submit\",\"title\":\"Edit\",\"data\":{\"confirm\":false}}]}"
>    )
>    ```
> 4. In the Message node, reference `Topic.ConfirmationCardJson` as the card JSON.

---

## Section 4 — Create the Status Topic (Phase 3 Placeholder)

### Step 4.1 — Create the topic

1. Topics → **Add a topic** → **From blank**.
2. Rename to: `Check Status`.
3. Click **Save**.

### Step 4.2 — Add trigger phrases

Click the Trigger node and add:
- `status`
- `what's the status`
- `status of WI`
- `check WI`
- `what's running`
- `active work items`
- `status WI`
- `check status`

### Step 4.3 — Add placeholder message

1. Click **+** below the trigger.
2. Select **Send a message**.
3. Message text:
   ```
   Status checking will be enabled in Phase 3.
   To view the current status of your work items, visit ADO directly.
   ```
4. Add an **End conversation** node.
5. Click **Save**.

---

## Section 5 — Create the Abort Topic (Phase 3 Placeholder)

1. Topics → **Add a topic** → **From blank**.
2. Rename to: `Abort Pipeline`.
3. Trigger phrases:
   - `abort`
   - `cancel`
   - `stop WI`
   - `abort WI`
   - `cancel pipeline`
   - `stop the pipeline`
4. Message node:
   ```
   Pipeline abort will be enabled in Phase 3.
   To stop a pipeline run now, remove the "ai-pipeline-trigger" tag from the work item in ADO.
   ```
5. Add **End conversation**. Click **Save**.

---

## Section 6 — Create the Retry Topic (Phase 3 Placeholder)

1. Topics → **Add a topic** → **From blank**.
2. Rename to: `Retry Pipeline`.
3. Trigger phrases:
   - `retry`
   - `try again`
   - `retry WI`
   - `restart pipeline`
   - `run again`
4. Message node:
   ```
   Pipeline retry will be enabled in Phase 3.
   To retry a failed pipeline now, remove and re-add the "ai-pipeline-trigger" tag in ADO.
   ```
5. Add **End conversation**. Click **Save**.

---

## Section 7 — Disable Conflicting Default System Topics

Go to **Topics** → **System** tab. Review and update the following:

| System Topic | Action | Reason |
|-------------|--------|--------|
| **Escalate** | Disable | There are no human agents to escalate to. Leaving it on causes confusing responses when users express frustration. |
| **Start over** | Keep but review | Acceptable as-is. When triggered, it resets the conversation — which is acceptable behavior. |
| **End of conversation** | Keep | Provides a clean close to conversations. |
| **Confirmed success** | Keep | Used by Copilot Studio internally for action confirmations. |
| **Fallback** | Edit, do not disable | Replace the default message with the help text from the Instructions. The Fallback topic fires when no other topic matches. |
| **Multiple topics matched** | Keep | Copilot Studio disambiguates automatically — leave default behavior. |
| **OnError** | Keep | Catches runtime errors. Do not disable. |

### Step 7.1 — Disable Escalate

1. Click on **Escalate** in the system topics list.
2. In the top-right corner, toggle the topic status from **On** to **Off**.
3. Confirm the disable prompt.

### Step 7.2 — Edit the Fallback topic

1. Click on **Fallback** in the system topics list.
2. Click the existing **Message** node.
3. Delete the existing message and replace with:
   ```
   I can help you with:

   · Submitting a new feature requirement — describe what you want to build
   · Checking pipeline status (Phase 3) — type "status WI-{id}"
   · Aborting a run (Phase 3) — type "abort WI-{id}"

   What would you like to do?
   ```
4. Click **Save**.

---

## Section 8 — Test the Bot in Copilot Studio

### Step 8.1 — Open the Test panel

1. In the top navigation bar, click **Test**.
2. The Test panel opens on the right side of the screen.
3. Click **Start a new conversation** (refresh icon at the top of the test panel).

### Step 8.2 — Test the Greeting flow

1. In the test input, type: `hello`
2. **Expected:** Bot responds with the welcoming message from Section 2 explaining what it does and asking you to describe a feature.

### Step 8.3 — Test the full intake flow

Run through the following conversation. Verify each bot response before sending the next message.

```
User:  "I want to add a dark/light mode toggle to the app"
Bot:   [Triggers Requirement Intake topic]
       Asks: "What's a short title for this requirement?"

User:  "Dark/Light Mode Toggle"
Bot:   Asks: "Describe the requirement in detail..."

User:  "Users should be able to switch between dark and light themes.
        The preference should persist across sessions."
Bot:   Asks: "What are the acceptance criteria?"

User:  "1. Toggle visible in navbar
        2. Clicking it switches theme immediately
        3. Preference persists after closing browser"
Bot:   Asks: "What is the priority?"
       [Shows: Critical / High / Medium / Low buttons]

User:  Clicks "High"
Bot:   [Shows Requirement Confirmation Adaptive Card with all four fields]

User:  Clicks "Confirm & Submit"
Bot:   [Calls Power Automate flow — may take 5–10 seconds]
       [Shows WI Created Success card with WI id and ADO link]
       "The pipeline is now running. You'll receive updates as it progresses."
```

### Step 8.4 — Test the Edit path

Repeat the intake up to the confirmation card. Click **Edit** instead of **Confirm & Submit**.

**Expected:** Bot returns to the first question ("What's a short title?").

### Step 8.5 — Test the Fallback

Type a message that does not match any topic, e.g.: `what's the weather?`

**Expected:** Bot responds with the Fallback help message.

### Step 8.6 — Verify in ADO

After a successful intake test:

1. Navigate to `https://dev.azure.com/nainika-dev/sdlc-agent`.
2. Open the **Boards** → **Work Items** view.
3. Find the newly created work item. Verify:
   - Title matches what you entered
   - Tags include `ai-pipeline-trigger`
   - Description contains the description text
   - Acceptance Criteria field is populated
   - Priority field is set correctly

---

## Notes

- **Environment:** Always confirm you are in the **SDLC Bot** environment (top-right switcher)
  before making changes. Changes in the wrong environment are not automatically visible in Teams.
- **Saving topics:** Copilot Studio does not auto-save. Always click **Save** after editing a topic.
- **Testing cards:** Adaptive Cards render correctly in the test panel for layout verification,
  but the `Action.Submit` response handling may differ slightly from live Teams behavior.
  Always do a final end-to-end test in Teams after deploying (see
  [`phase2-teams-deployment.md`](phase2-teams-deployment.md)).
- **Variable naming:** Variable names are case-sensitive in Copilot Studio. Use the exact names
  `RequirementTitle`, `RequirementDescription`, `AcceptanceCriteria`, `Priority`, `WorkItemId`,
  `WorkItemUrl` throughout this guide. Changing them requires updating all references.
