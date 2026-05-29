# Teams Integration Setup Guide

## Prerequisites

Before deploying Phase 2, you must have:

- **Microsoft 365 account** with access to Teams and Copilot Studio
- **Azure DevOps organization** (`{ADO_ORG}`) with an existing project (`{ADO_PROJECT}`)
- **ADO Personal Access Token** (`{ADO_PAT}`) with scopes:
  - Work Items: Read & Write
  - Project & Team: Read
- **GitHub repository** (`{GITHUB_REPO}`, format: `owner/repo`) with a clone or working directory
- **Power Automate** access (included with most M365 subscriptions)
- **Copilot Studio** environment (create a new one, see below)
- **Teams desktop or web client**

---

## Placeholder Reference

Every file in the `teams/` directory contains placeholders. Before deploying, replace:

**Phase 2 placeholders (required for work item creation):**

| Placeholder | Description | Example |
|---|---|---|
| `{ADO_ORG}` | Your Azure DevOps organization name | `myorg` (from `dev.azure.com/myorg`) |
| `{ADO_PROJECT}` | Your ADO project name | `MyProject` |
| `{ADO_ASSIGNEE_EMAIL}` | Email to assign created work items to | `developer@company.com` |
| `{TEAMS_USER_EMAIL}` | Your Teams / M365 email (the bot operator) | `user@company.com` |
| `{ADO_PAT}` | Your ADO Personal Access Token (Work Items R/W) | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `{GITHUB_REPO}` | Your GitHub repo (owner/repo format) | `myorg/my-sdlc-repo` |
| `{ADO_TRIGGER_TAG}` | The tag that triggers the pipeline orchestrator | `ai-pipeline-trigger` (or custom) |

**Phase 3 placeholders (required for notifications and status check):**

| Placeholder | Description | Example |
|---|---|---|
| `{FLOW_A_URL}` | HTTP POST URL of `SDLC - ADO State Notifier` flow trigger | _(copy from Power Automate after saving the flow)_ |
| `{FLOW_B_URL}` | HTTP POST URL of `SDLC - ADO Comment Relay` flow trigger | _(copy from Power Automate after saving the flow)_ |

**How to get `{FLOW_A_URL}` and `{FLOW_B_URL}`:**
1. Open Power Automate → SDLC Bot environment
2. Open the flow (`SDLC - ADO State Notifier` or `SDLC - ADO Comment Relay`)
3. Click the **When an HTTP request is received** trigger card
4. Copy the full URL from the **HTTP POST URL** field
5. Paste into the corresponding ADO service hook (see phase3-ado-service-hooks.md)

---

## Deployment Order

Follow these steps in sequence:

### Step 1: Create Copilot Studio Environment

1. Open **Power Automate** (`https://make.powerautomate.com`)
2. Top left: click **Environments**
3. Click **New environment**
4. Name: `SDLC Bot` (or your preferred name)
5. Region: your preferred region
6. Click **Create**
7. Wait 2–3 minutes for provisioning

Note the environment name for use in subsequent steps.

### Step 2: Prepare Configuration Values

Create a local text file with these values (you'll need them for Power Automate):

```
ADO_ORG = {ADO_ORG}
ADO_PROJECT = {ADO_PROJECT}
ADO_ASSIGNEE_EMAIL = {ADO_ASSIGNEE_EMAIL}
ADO_PAT = {ADO_PAT}
ADO_TRIGGER_TAG = {ADO_TRIGGER_TAG}
```

**Important:** Keep this file local; do not commit it to version control.

### Step 3: Build the Power Automate Flow

Follow **[teams/build-guides/phase2-power-automate-flow.md](build-guides/phase2-power-automate-flow.md)**:

1. Switch to the SDLC Bot environment (top right of Power Automate)
2. Create a new cloud flow from blank
3. Name it: `SDLC - Create ADO Work Item`
4. Add the HTTP trigger
5. Add Initialize Variable actions for the 4 config values
6. Add the Create Work Item action (ADO connector)
7. Add a Respond action to return the work item ID
8. Save the flow; note its HTTP POST URL for Step 5

### Step 4: Set Up Copilot Studio Bot

Follow **[teams/build-guides/phase2-copilot-studio-setup.md](build-guides/phase2-copilot-studio-setup.md)**:

1. Switch to the SDLC Bot environment in Copilot Studio
2. Create a new bot: `SDLC Pipeline Bot`
3. Create a Greeting topic (no intake phrases)
4. Create a CollectRequirement topic with actions to:
   - Ask for title
   - Ask for description
   - Ask for work item type (Feature or User Story)
5. Create a Confirmation topic to review the submission
6. Add a flow action to call the Power Automate flow (from Step 3)
7. Publish the bot

### Step 5: Deploy to Teams

Follow **[teams/build-guides/phase2-teams-deployment.md](build-guides/phase2-teams-deployment.md)**:

1. In Copilot Studio, go to **Publish**
2. Go to the **Teams** channel
3. Click **Publish to Teams**
4. Install the bot to your Teams account

### Step 6: Test End-to-End

1. Open Teams
2. Go to **Apps** → search `SDLC Pipeline Bot` → **Open**
3. Type a feature request (e.g., "Add dark mode toggle")
4. Follow the bot prompts to confirm
5. Check Azure DevOps: a new work item tagged `{ADO_TRIGGER_TAG}` should appear in `{ADO_PROJECT}`
6. Wait up to 60 seconds; the pipeline orchestrator should detect it and run

---

## Common Issues

| Issue | Solution |
|---|---|
| Power Automate flow fails to create work item | Verify `{ADO_PAT}` is correct and has Work Items R/W scope. Check `{ADO_ORG}` and `{ADO_PROJECT}` spelling. |
| Copilot Studio bot doesn't call the flow | Verify the flow action references the correct HTTP endpoint from Step 3. Republish the bot. |
| Pipeline doesn't trigger | Verify the work item is tagged with `{ADO_TRIGGER_TAG}` and state is `New`. Check orchestrator logs. |
| Bot offline in Teams | Verify the bot is published to Teams (Copilot Studio → Publish → Teams). Check Copilot Studio environment is SDLC Bot. |

---

## Configuration Files to Update

Once deployed, update these files in your local repository to match your environment:

| File | What to replace |
|---|---|
| `.env` | `ADO_ORG`, `ADO_PROJECT`, `ADO_PAT`, `GITHUB_REPO` |
| `teams/build-guides/phase2-power-automate-flow.md` | All placeholders |
| `teams/build-guides/phase2-copilot-studio-setup.md` | All placeholders |
| `teams/README.md` | All placeholders |
| `CLAUDE.md` | All placeholders |

---

## Phase 3 Setup (Notifications + Status Check)

Once Phase 2 is working, follow these steps to activate Phase 3:

### Step 7: Build the Notify Flows

Follow **[teams/build-guides/phase3-power-automate-notify-flows.md](build-guides/phase3-power-automate-notify-flows.md)**:

1. Build `SDLC - ADO State Notifier` (Flow A) — copy its HTTP trigger URL as `{FLOW_A_URL}`
2. Build `SDLC - ADO Comment Relay` (Flow B) — copy its HTTP trigger URL as `{FLOW_B_URL}`

### Step 8: Configure ADO Service Hooks

Follow **[teams/build-guides/phase3-ado-service-hooks.md](build-guides/phase3-ado-service-hooks.md)**:

1. Work item created → `{FLOW_A_URL}`
2. Work item state changed → `{FLOW_A_URL}`
3. Comment added → `{FLOW_B_URL}`
4. Pull request created → `{FLOW_A_URL}`

### Step 9: Activate Check Status Topic

Follow **[teams/build-guides/phase3-activate-status-topic.md](build-guides/phase3-activate-status-topic.md)**:

1. Build `SDLC - Get WI Status` (Power Automate)
2. Activate the `CheckStatus` topic in Copilot Studio
3. Publish the bot

---

## Next Steps

Once Phase 2 is verified:

1. Update `.env` with actual values (never commit to version control)
2. Configure the pipeline orchestrator to poll ADO (see `CLAUDE.md`)
3. Create a test work item via the Teams bot
4. Monitor pipeline execution in `runs/` directory

For detailed Phase 2 architecture, see **[teams/README.md](README.md)**.

---

*Last updated: 2026-05-26*
