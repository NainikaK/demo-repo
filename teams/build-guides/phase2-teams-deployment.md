# Phase 2 Build Guide: Teams Deployment

## Overview

This guide walks through publishing the Copilot Studio bot to Microsoft Teams so
that users can access it from within Teams chat.

---

## Prerequisites

- The `SDLC Pipeline Bot` created and published in Copilot Studio (see phase2-copilot-studio-setup.md)
- Microsoft Teams desktop or web client installed and logged in
- Permission to install apps in your Teams account (typically available for all users)
- The Teams email address (`{TEAMS_USER_EMAIL}`) where the bot will be installed

---

## Section 1: Publish the Bot in Copilot Studio

Before deploying to Teams, ensure the bot is published in Copilot Studio.

1. Open **Copilot Studio** (same environment where you built the bot)
2. Open the `SDLC Pipeline Bot`
3. Top right: click **Publish**
4. Review the changes (topics, variables, flow actions)
5. Click **Publish** to confirm
6. Wait for the publish operation to complete (usually 1–2 minutes)

---

## Section 2: Configure Teams Channel

In Copilot Studio, configure the bot for Teams deployment.

1. Open the bot
2. Left sidebar: scroll down and click **Channels**
3. Select **Microsoft Teams**
4. You'll see options for:
   - **Publish to Teams** (personal app)
   - **Publish to Teams in an organization** (org-wide)

For Phase 2, we deploy as a **personal app** (individual user install).

---

## Section 3: Deploy as a Personal App

Personal app deployment means the bot is installed for a single user's Teams account.

### 3.1: Generate the Bot Package

1. In the Teams channel section, click **Publish to Teams** (personal app)
2. Copilot Studio generates an app package (`.zip` file)
3. You'll see a message: "Ready to publish to Teams"
4. Click **Download as zip** to get the app package
5. Save the file locally

### 3.2: Manual Installation (Alternative)

If you see a direct "Install in Teams" button:

1. Click **Install in Teams**
2. A Teams window opens with an installation dialog
3. Click **Add** to install the bot to your Teams account
4. Skip to Section 4

### 3.3: Upload the Package via Teams Admin Center (For Org Deployment)

If you want to deploy organization-wide (optional, not required for Phase 2):

1. Open **Teams Admin Center** (`https://admin.teams.microsoft.com`)
2. Left sidebar: **Teams apps** → **Manage apps**
3. Click **Upload new app**
4. Select the `.zip` file downloaded in Section 3.1
5. Click **Add**
6. Approve the app for your organization

For Phase 2, this step is **optional**. Skip to Section 4.

---

## Section 4: Install the Bot in Teams

After the bot is published, install it in your Teams account.

### 4.1: Open Teams

1. Open **Microsoft Teams** (`https://teams.microsoft.com` or the desktop app)
2. Log in with your Teams account (`{TEAMS_USER_EMAIL}`)

### 4.2: Find and Install the Bot

1. Left sidebar: click **Apps**
2. Search for `SDLC Pipeline Bot`
3. Click on the bot in the results
4. Click **Add** or **Open** to install
5. A dialog appears: "Add to a chat" or "Add to your Teams"
6. Click **Add** to complete the installation

The bot is now available in your Teams account.

---

## Section 5: Verify Installation

Once installed, verify the bot is working.

1. In Teams, click **Chat** (left sidebar)
2. Look for `SDLC Pipeline Bot` in your chat history or recent contacts
3. Click to open the conversation
4. Send a message: "Hi" or "Add a new feature"
5. The bot should respond with the greeting message
6. Follow the conversation flow to test requirement collection

---

## Section 6: Share with Other Users (Optional)

If you want other users to access the bot:

### Option A: Personal Installation (Easiest)

Send the app package `.zip` file to each user:

1. Ensure they have the same Copilot Studio environment access
2. They can upload the `.zip` file via Teams Admin Center or install it locally

### Option B: Organizational Deployment

1. Upload the app package via Teams Admin Center (Section 3.3)
2. Approve it organization-wide
3. Users can find it in their Teams app store

For Phase 2, personal installation is sufficient.

---

## Section 7: Testing on Teams

### Functional Test

1. Open the `SDLC Pipeline Bot` in Teams
2. Send: "I need a dark mode toggle"
3. The bot should:
   - Acknowledge your request
   - Ask for a title (if not already provided)
   - Ask for a description
   - Ask for work item type (Feature or User Story)
   - Show a confirmation card
   - Call the Power Automate flow
   - Confirm work item creation

### ADO Verification

1. During the bot conversation, confirm your requirement
2. Check Azure DevOps (`dev.azure.com/{ADO_ORG}/{ADO_PROJECT}`)
3. A new work item should appear in the backlog with:
   - Title: your provided title
   - Description: your provided description
   - Type: Feature or User Story
   - Tag: `{ADO_TRIGGER_TAG}` (default: `ai-pipeline-trigger`)
   - State: New
   - Assigned to: `{ADO_ASSIGNEE_EMAIL}`

### Pipeline Trigger Verification

1. Wait up to 60 seconds
2. The pipeline orchestrator should detect the new work item (it polls every 60s)
3. Check the `runs/` directory in your repository for pipeline execution logs

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Bot doesn't appear in Teams app search | Verify the bot is published in Copilot Studio. Wait 5 minutes for propagation. Try a hard refresh (Ctrl+R). |
| "Unable to install" error | Check you have permission to install apps in Teams (ask your Teams admin). Verify the bot environment is active. |
| Bot responds but doesn't collect input | Verify topics are configured correctly (CollectRequirement, ConfirmSubmission). Republish the bot. |
| Flow action fails when bot calls it | Verify the Power Automate flow HTTP endpoint is correct. Check flow inputs match variable names. |
| Work item doesn't appear in ADO | Verify `{ADO_ORG}` and `{ADO_PROJECT}` are correct. Check `{ADO_PAT}` has Work Items R/W scope. |

---

## Updating the Bot

If you make changes to the bot in Copilot Studio:

1. Click **Publish** in Copilot Studio
2. Wait 1–2 minutes
3. The Teams bot automatically updates (no re-installation needed)
4. Users will see the updated bot next time they chat

---

## Removal

To remove the bot from your Teams account:

1. In Teams, right-click the bot in your chat list
2. Click **Remove** or **Uninstall**
3. Confirm the removal

The bot is deleted from your Teams, but remains published in Copilot Studio.

---

## Environment Notes

- **Deployment environment:** Same Copilot Studio environment (SDLC Bot) where you created the bot
- **Teams account:** Use `{TEAMS_USER_EMAIL}` to install
- **Regional availability:** The bot is available in all Teams regions where Copilot Studio is supported
- **Persistence:** The bot remains installed until you manually remove it

---

## Known Limitations

- The bot is a personal app and appears only in the installing user's Teams
- The bot cannot be shared organization-wide without uploading via Teams Admin Center
- Message history persists only in that user's Teams chat

For organization-wide deployment, follow Section 3.3 (upload via Teams Admin Center).

---

*Last updated: 2026-05-26*
