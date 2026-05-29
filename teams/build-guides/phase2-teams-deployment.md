# Phase 2 — Deploying the Bot to Microsoft Teams

**Bot name:** SDLC Pipeline Bot  
**Target:** SDLC Bot team in Microsoft Teams  
**Prerequisites:** Bot built in Copilot Studio · Power Automate flow saved and tested · Teams admin access (or approval from Teams admin to install a custom app)

---

## Step 1 — Publish the Agent in Copilot Studio

Publishing makes the bot's latest topic changes available. The bot must be published
before it can be accessed in Teams.

### Step 1.1 — Open the agent

1. Navigate to [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com).
2. Confirm you are in the **SDLC Bot** environment (top-right environment picker).
3. In the left navigation, click **Agents** (or **Home** if already on the agent page).
4. Click on **SDLC Pipeline Bot** to open it.

### Step 1.2 — Publish

1. In the top-right corner of the agent canvas, click **Publish**.
2. A confirmation dialog appears: "Are you sure you want to publish?"
3. Click **Publish** to confirm.
4. Wait for the green toast notification: "Your agent has been published successfully."

> Publishing takes 1–3 minutes on first publish. Subsequent publishes are faster.
> The bot is NOT available in Teams until this step is complete.

---

## Step 2 — Enable the Microsoft Teams Channel

Channels in Copilot Studio control where the bot can be accessed. You need to enable
the Teams channel and configure it.

### Step 2.1 — Open Channels settings

1. In the SDLC Pipeline Bot agent page, click **Settings** in the top navigation bar
   (or click the gear icon).
2. In the left panel, select **Channels**.

### Step 2.2 — Enable Microsoft Teams

1. Find **Microsoft Teams** in the channel list.
2. Click on it.
3. Click **Turn on Teams** (or **Enable** / **Add to Teams** depending on your Copilot Studio version).
4. A configuration panel opens.

### Step 2.3 — Configure the Teams channel

Fill in or verify the following settings:

| Setting | Value |
|---------|-------|
| **Display name** | `SDLC Pipeline Bot` |
| **Short description** | `Submit feature requirements and track pipeline progress` |
| **Long description** | `The SDLC Pipeline Bot guides you through submitting software feature requirements. Once submitted, an AI pipeline handles design, development, testing, and code review automatically. Use this bot to submit new requirements and check pipeline status.` |
| **Privacy policy URL** | Leave blank for internal tools, or enter your org's privacy policy URL |
| **Terms of use URL** | Leave blank for internal tools |

> **Icon (optional):** Upload a 192×192 px PNG for the bot's Teams avatar. This is
> optional but recommended so the bot is identifiable in the channel.

### Step 2.4 — Download the Teams app manifest (optional but recommended)

Copilot Studio can generate a Teams app package (.zip) that you can sideload or submit
to your Teams admin for managed distribution.

1. In the Teams channel configuration panel, click **Download Teams app** (or similar button).
2. Save the `.zip` file — you will use this in Step 3.

### Step 2.5 — Save the channel configuration

1. Click **Save** in the Teams channel panel.
2. The channel now shows **Status: Connected** (or **Enabled**).

---

## Step 3 — Add the Bot to the Teams Environment

There are two ways to add the bot to Teams depending on your org's Teams app governance:

**Option A — Direct install (no admin approval required):** suitable for development and testing.  
**Option B — Teams admin deployment:** suitable for production, makes the bot available to specific teams or all users.

### Option A — Install directly via app link (for testing)

1. After enabling the Teams channel in Step 2, the channel configuration page shows
   a link: **"Open in Teams"** or a button to open the bot directly.
2. Click that link. Your browser opens the Teams app.
3. Teams prompts: "Add SDLC Pipeline Bot?" — click **Add**.
4. The bot opens in a personal chat. You can now message it directly.

Alternatively, in Teams:
1. Click the **Apps** icon in the left Teams rail (grid icon).
2. Search for `SDLC Pipeline Bot`.
3. If it appears (requires admin pre-approval or the app was sideloaded), click **Add**.

### Option B — Sideload the app package (for direct team installation)

Use this if the bot doesn't appear in Teams search (no admin-managed distribution yet).

1. In Teams, click **Apps** in the left rail.
2. Click **Manage your apps** (bottom of the app panel).
3. Click **Upload an app** → **Upload a custom app**.
4. Select the `.zip` manifest file downloaded in Step 2.4.
5. Teams shows a preview of the app. Click **Add** (or **Add to a team** to install in a channel).

To add to a specific team/channel:
1. In step 5 above, click **Add to a team**.
2. Search for and select the **SDLC Bot** team name.
3. Select the channel (e.g. **General** or a dedicated **#pipeline-requests** channel).
4. Click **Set up a bot**.

### Option C — Teams admin centre deployment (production)

For organisation-wide or controlled rollout, ask your Microsoft 365 Teams admin to:

1. Log in to the **Microsoft Teams Admin Centre** at
   [admin.teams.microsoft.com](https://admin.teams.microsoft.com).
2. Navigate to **Teams apps** → **Manage apps**.
3. Click **Upload new app** and upload the `.zip` from Step 2.4.
4. Once uploaded, navigate to **Teams apps** → **Setup policies**.
5. Create a new policy or edit an existing one to pin the SDLC Pipeline Bot for the
   target users or teams.
6. Assign the policy to the **SDLC Bot** team members.

---

## Step 4 — Find and Message the Bot in Teams

After the bot is added, locate it in Teams:

### In a personal chat (direct message)

1. In Teams, click the **Chat** icon (speech bubble) in the left rail.
2. Click **New chat** (pencil icon at the top).
3. In the "To:" field, type `SDLC Pipeline Bot`.
4. Select it from the dropdown.
5. Click **Open** to start a conversation.

### In a team channel

If the bot was added to a team/channel (Option B above):
1. Navigate to the **SDLC Bot** team in Teams.
2. Open the channel the bot was added to.
3. In the message compose box, type `@SDLC Pipeline Bot` to mention the bot.
4. The bot responds to direct messages and @-mentions in the channel.

---

## Step 5 — End-to-End Test in Teams

This is the final validation step. Run the complete flow from Teams message → ADO work item → confirmation received.

### Step 5.1 — Trigger the greeting

1. In the SDLC Pipeline Bot chat, type: `hello`
2. **Expected:** Bot responds with the welcome message explaining its purpose and asking you to describe a feature.

### Step 5.2 — Run the full intake

```
You:   "I want to add a dark/light mode toggle to the header"
Bot:   "What's a short title for this requirement?"

You:   "Dark/Light Mode Toggle"
Bot:   "Describe the requirement in detail..."

You:   "Users should be able to switch between dark and light themes.
        The preference must persist across browser sessions."
Bot:   "What are the acceptance criteria?"

You:   "1. A toggle button appears in the top-right of the navigation bar
        2. Clicking the toggle switches the theme without a page reload
        3. The theme preference persists when the user closes and reopens the browser
        4. Default theme for new users is light mode"
Bot:   "What is the priority?"
       [Shows: Critical | High | Medium | Low buttons]

You:   Click "High"
Bot:   [Shows the Requirement Confirmation Adaptive Card]
       — Title, Priority, Description, and Acceptance Criteria visible
       — "Confirm & Submit" and "Edit" buttons at the bottom

You:   Click "Confirm & Submit"
Bot:   [Waits 5–15 seconds while Power Automate runs]
       [Shows WI Created Success card]
       — "✅ Work Item Created"
       — WI-{id} (actual number)
       — Title, Priority, Type, State, Tag fields
       — "View in ADO ↗" button
       "The AI pipeline is starting. You will receive updates as it progresses."
```

### Step 5.3 — Verify the ADO link works

1. Click **View in ADO ↗** in the success card.
2. **Expected:** The Azure DevOps work item opens in your browser at
   `https://dev.azure.com/nainika-dev/sdlc-agent/_workitems/edit/{id}`.
3. Verify the work item fields:

   | Field | Expected value |
   |-------|---------------|
   | Title | `Dark/Light Mode Toggle` |
   | State | `New` |
   | Tags | `ai-pipeline-trigger` |
   | Description | Contains the description you entered |
   | Acceptance Criteria | Contains the criteria you entered |
   | Priority | Correct numeric value (1 for High) |

### Step 5.4 — Verify pipeline picks it up (if orchestrator is running)

1. Wait up to 60 seconds.
2. Refresh the ADO work item page.
3. **Expected:** State changes from `New` to `Active`.
4. This confirms the orchestrator has detected the new work item and the pipeline is running.

### Step 5.5 — Test the Edit path

Repeat Steps 5.1–5.2, but on the Confirmation card click **Edit** instead of
**Confirm & Submit**.

**Expected:** Bot returns to the first question: "What's a short title for this requirement?"
The previous values are NOT pre-filled (Copilot Studio clears variables on topic restart
unless you configure variable persistence — pre-filling is a Phase 3 enhancement).

### Step 5.6 — Test the Fallback

Type a message that does not match any topic: `What's the weather?`

**Expected:** Bot responds with the help message listing available actions.

---

## Troubleshooting

### Bot does not appear in Teams search

- Confirm the bot was published in Copilot Studio (Step 1).
- Confirm the Teams channel is enabled (Step 2).
- If using Option A, try the direct "Open in Teams" link from the Copilot Studio channel page.
- If using Option B, confirm the `.zip` was uploaded without errors.
- Allow up to 10 minutes for the app to propagate in Teams.

### Bot responds but the Adaptive Card does not show

- Verify the card JSON is valid: paste it into [adaptivecards.io/designer](https://adaptivecards.io/designer)
  and confirm no schema errors appear.
- Confirm the card version is `1.4` (not 1.5 or 2.0 — not fully supported in Teams).
- If the card shows as a plain text message, the card JSON may not have been pasted
  correctly. Revisit the Copilot Studio setup (Section 3.7 of the setup guide).

### Power Automate flow fails

- Check the Power Automate run history for the specific error.
- **401 Unauthorized:** The ADO PAT is incorrect, expired, or lacks Work Items write scope.
  Generate a new PAT and update the HTTP action's Password field.
- **404 Not Found:** Verify the ADO org and project name in the URI:
  `https://dev.azure.com/nainika-dev/sdlc-agent`. Check for typos.
- **400 Bad Request:** The JSON Patch body has a formatting error. Copy the body from
  the failing run and validate it at [jsonlint.com](https://jsonlint.com).

### WI created but pipeline does not pick it up

- Confirm the work item has the `ai-pipeline-trigger` tag. Check the Tags field in ADO.
- Confirm the work item type matches what the orchestrator polls for. See the work item
  type note at the top of [`phase2-power-automate-flow.md`](phase2-power-automate-flow.md).
- Confirm the orchestrator is running (`pipeline/orchestrator/main.py`).
- Check pipeline logs for any polling errors.

---

## Post-Deployment Checklist

Mark each item once confirmed working in Teams:

- [ ] Bot responds to "hello" with the greeting message
- [ ] Full intake conversation completes in Teams (not just the test panel)
- [ ] Adaptive Confirmation card renders with correct variable values
- [ ] "Confirm & Submit" creates a work item in ADO with correct fields and `ai-pipeline-trigger` tag
- [ ] "Edit" returns the conversation to the first intake question
- [ ] The "View in ADO ↗" link in the success card opens the correct work item
- [ ] Power Automate flow run history shows successful runs
- [ ] Fallback message appears for unrecognised input
- [ ] Pipeline orchestrator detects the new work item within 60 seconds (if running)
