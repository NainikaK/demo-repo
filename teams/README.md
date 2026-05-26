# Teams Integration — SDLC Pipeline Bot

## Overview

**Phase 2 Status: Complete and tested end-to-end.**

Phase 2 of the SDLC automation project adds a Microsoft Teams front-end so that a
Product Owner can submit a plain-English feature requirement directly from a Teams chat.
The bot collects the requirement, a Power Automate flow creates the correctly tagged ADO
work item, and the pipeline triggers automatically — no ADO UI interaction required.

The integration uses a **config-driven architecture**: all environment-specific values
(org names, project names, emails, tags) are stored as Power Automate variables and
Copilot Studio parameters, making the entire setup portable. To deploy this bot to your
environment, see **[teams/SETUP.md](SETUP.md)**.

---

## Components

| Component | Platform | Name / Location |
|---|---|---|
| Conversational bot | Copilot Studio — SDLC Bot environment | `SDLC Pipeline Bot` |
| ADO work item flow | Power Automate — SDLC Bot environment | `SDLC - Create ADO Work Item` |
| Teams install | Personal install for `{TEAMS_USER_EMAIL}` |

---

## How It Works

```
User types requirement in Teams chat (as {TEAMS_USER_EMAIL})
            │
            ▼
  SDLC Pipeline Bot (Copilot Studio)
  · Prompts for: title, description, work item type
  · Confirms details with the user before submitting
            │
            ▼
  SDLC - Create ADO Work Item (Power Automate)
  · Triggered by the bot via HTTP action
  · Uses config variables:
      - {ADO_ORG}: organization name
      - {ADO_PROJECT}: project name
      - {ADO_ASSIGNEE_EMAIL}: assignee email
      - {ADO_TRIGGER_TAG}: trigger tag (default: ai-pipeline-trigger)
  · Creates a work item in Azure DevOps with:
      - Type:  Feature or User Story
      - State: New
      - Tag:   {ADO_TRIGGER_TAG}
            │
            ▼
  ADO work item appears in the backlog at dev.azure.com/{ADO_ORG}/{ADO_PROJECT}
            │
            ▼
  Pipeline Orchestrator picks it up (polls every 60 s)
  → 8-agent pipeline runs automatically
```

---

## Config-Driven Architecture

All environment-specific values are stored as **Power Automate variables**, not
hardcoded. This makes deployment portable:

1. Deploy the Power Automate flow to any environment
2. Update the 4 Initialize Variable actions:
   - `ADO_ORG` = your org name
   - `ADO_PROJECT` = your project name
   - `ADO_ASSIGNEE_EMAIL` = assignee email
   - `ADO_TRIGGER_TAG` = your trigger tag
3. Deploy Copilot Studio to reference those variables
4. No code changes needed

See **[teams/build-guides/phase2-power-automate-flow.md](build-guides/phase2-power-automate-flow.md)** (Section 2.5) for details.

---

## Bot Configuration (Copilot Studio)

- **Environment:** SDLC Bot environment
- **Bot name:** `SDLC Pipeline Bot`
- **Channel:** Microsoft Teams (personal install for `{TEAMS_USER_EMAIL}`)
- **Topics:** collects title, description, and work item type; confirms before calling the flow
- **Variable types:** All inputs stored as strings for compatibility with the Power Automate flow

---

## Flow Configuration (Power Automate)

- **Environment:** SDLC Bot environment (same as Copilot Studio)
- **Flow name:** `SDLC - Create ADO Work Item`
- **Authentication:** ADO Personal Access Token (`{ADO_PAT}`) with Work Items R/W scope
- **Trigger:** HTTP request from Copilot Studio
- **Config Variables:**
  - `ADO_ORG` (string)
  - `ADO_PROJECT` (string)
  - `ADO_ASSIGNEE_EMAIL` (string)
  - `ADO_TRIGGER_TAG` (string)
- **Actions:**
  1. Parse the JSON body from the bot (title, description, type)
  2. Create a work item in Azure DevOps using the ADO connector
  3. Apply the `{ADO_TRIGGER_TAG}` tag
  4. Return the new work item ID to the bot for confirmation

---

## Teams Install

The bot is installed as a **personal app** for the operator (`{TEAMS_USER_EMAIL}`).
No team-wide or channel deployment is required for Phase 2.

To deploy to your account: follow **[teams/SETUP.md](SETUP.md)** (Step 5).

---

## End-to-End Verification

Phase 2 was verified by:

1. Submitting a test requirement through the Teams bot
2. Confirming the Power Automate flow created a new ADO work item with state `New` and the correct tag
3. Verifying the pipeline orchestrator detected the work item within one poll cycle (≤ 60 s)
4. Confirming the 8-agent pipeline ran to completion

---

## Environment Variables & Placeholders

This repository uses **placeholders** for all environment-specific values. Before
running any code or deploying to Teams, replace all placeholders:

| Placeholder | Replace With | Example |
|---|---|---|
| `{ADO_ORG}` | Your ADO organization name | `myorg` (from `dev.azure.com/myorg`) |
| `{ADO_PROJECT}` | Your ADO project name | `MyProject` |
| `{ADO_ASSIGNEE_EMAIL}` | Email to assign work items to | `developer@company.com` |
| `{TEAMS_USER_EMAIL}` | Your Teams / M365 email | `user@company.com` |
| `{ADO_PAT}` | Your ADO Personal Access Token | _(40-char hex string)_ |
| `{GITHUB_REPO}` | Your GitHub repo (owner/repo) | `myorg/my-repo` |
| `{ADO_TRIGGER_TAG}` | Pipeline trigger tag | `ai-pipeline-trigger` |

**See [teams/SETUP.md](SETUP.md) (Placeholder Reference section) for a complete list.**

---

## Build Guides

For detailed step-by-step instructions, see:

**[teams/SETUP.md](SETUP.md)** — Initial setup and full deployment checklist (Phase 2 and Phase 3)

**Phase 2 — Work Item Creation:**
- **[phase2-power-automate-flow.md](build-guides/phase2-power-automate-flow.md)** — Build the ADO work item creation flow
- **[phase2-copilot-studio-setup.md](build-guides/phase2-copilot-studio-setup.md)** — Build the Teams bot
- **[phase2-adaptive-card-json.md](build-guides/phase2-adaptive-card-json.md)** — Confirmation card structure
- **[phase2-teams-deployment.md](build-guides/phase2-teams-deployment.md)** — Deploy to Teams

**Phase 3 — Notifications and Status Check (in progress):**
- **[phase3-ado-service-hooks.md](build-guides/phase3-ado-service-hooks.md)** — Configure 4 ADO service hooks (work item created, state changed, comment, PR)
- **[phase3-power-automate-notify-flows.md](build-guides/phase3-power-automate-notify-flows.md)** — Build Flow A (state notifier) and Flow B (comment relay)
- **[phase3-activate-status-topic.md](build-guides/phase3-activate-status-topic.md)** — Build status-check flow and activate Check Status bot topic

---

## Known Issues & Lessons Learned

### Issue 1: Variable Type Consistency
In Copilot Studio, store all user inputs as **String** type, even for choice questions
(e.g., Feature vs User Story). This ensures compatibility with Power Automate.

### Issue 2: Greeting Topic Timing
The Greeting topic may not trigger on every conversation start if the bot is cached.
Always route the Greeting topic to a primary topic (e.g., CollectRequirement).

### Issue 3: Flow Environment Matching
The Power Automate flow and Copilot Studio bot **must be in the same environment**.
Copilot Studio looks for flows in its own environment; cross-environment flows don't appear.

---

---

## Phase 3: Notifications and Status Check (In Progress)

Phase 3 closes the feedback loop: every event the pipeline agents generate in ADO
(state changes, comments, PR creation) is relayed to the operator's Teams chat in
real time. The operator can also query work item status directly from the bot.

**New components in Phase 3:**

| Component | Type | Name | Purpose |
|---|---|---|---|
| Flow A | Power Automate | `SDLC - ADO State Notifier` | Receives ADO webhook events and posts Teams messages |
| Flow B | Power Automate | `SDLC - ADO Comment Relay` | Relays ADO comments; routes human-input requests to Adaptive Card |
| Flow C | Power Automate | `SDLC - Get WI Status` | Fetches live work item status from ADO REST API |
| ADO hooks | ADO Service Hooks | 4 subscriptions | Fire webhooks to Flow A/B on work item and PR events |
| Bot topic | Copilot Studio | `CheckStatus` topic | Lets user query any work item number by chat |

**New placeholders for Phase 3:**

| Placeholder | Replace With |
|---|---|
| `{FLOW_A_URL}` | HTTP POST URL from `SDLC - ADO State Notifier` trigger |
| `{FLOW_B_URL}` | HTTP POST URL from `SDLC - ADO Comment Relay` trigger |

See **[teams/SETUP.md](SETUP.md)** (Phase 3 Setup section) and the Phase 3 build guides above.

---

*Last updated: 2026-05-26*
