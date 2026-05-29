# Teams Integration — Design Document

## Overview

The Teams Integration is a pure mediation and UI layer that sits between users and the
existing SDLC automation pipeline. It adds no pipeline logic, modifies no existing
agents, and does not alter how Azure DevOps work items are processed.

Users interact exclusively through Microsoft Teams. The bot translates Teams messages
into ADO work items, forwards pipeline events back as Teams notifications, and handles
human-in-the-loop decisions via Adaptive Cards.

Everything behind the Teams bot is untouched: the orchestrator, all eight agents, ADO
work item logic, GitHub integration, and all audit and merge rules remain exactly as
documented in CLAUDE.md.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Microsoft Teams                            │
│                                                                 │
│   User ──► Teams Bot ──────────────────► Adaptive Cards        │
│              │   ▲                             │                │
│              │   └─── Notify Hook ─────────────┘                │
│              │                                                  │
└──────────────┼──────────────────────────────────────────────────┘
               │
    ┌──────────┴───────────────────────┐
    │  Intake Hook  │  Human Input Hook│
    ▼               ▼                  │
┌─────────┐   ┌────────────────────┐  │
│  ADO    │   │  ADO Service Hooks │  │
│  API    │   │  (inbound webhooks)│  │
│ (write) │   └────────────────────┘  │
└────┬────┘            │              │
     │                 │              │
     └────────┬────────┘              │
              ▼                       │
┌─────────────────────────────────────┴────────────────────────┐
│                     Azure DevOps                              │
│                                                               │
│   Work Items  ──  Comments  ──  State  ──  Tags               │
└───────────────────────────┬───────────────────────────────────┘
                            │  (polled every 60 s by orchestrator)
┌───────────────────────────▼───────────────────────────────────┐
│               Existing Pipeline  (completely unchanged)        │
│                                                               │
│  Orchestrator → Agent 1 → Agent 2 → ... → Agent 8            │
│                                           ↓                   │
│                            GitHub PR  ←── Supervisor          │
└───────────────────────────────────────────────────────────────┘
```

The pipeline never knows Teams exists. It reads and writes ADO work items and comments
exactly as it does today.

---

## Three Integration Points

### 1. Intake Hook
**Direction:** Teams → ADO

The bot collects requirement details from the user through a guided conversation (title,
description, acceptance criteria, priority). After the user confirms via the Requirement
Confirmation card, the bot calls the ADO API to create a new work item of type Feature
or User Story with state New and tag `ai-pipeline-trigger`.

See: [`flows/intake_flow.md`](flows/intake_flow.md)

### 2. Notify Hook
**Direction:** ADO → Teams

ADO service hooks fire HTTP POST webhooks to the bot on work item state changes, comment
additions, and pull request events. The bot maps each event to the correct Teams thread
(keyed by WI ID) and sends a formatted notification or Adaptive Card to the user.

See: [`flows/notify_flow.md`](flows/notify_flow.md), [`webhooks/ado_to_teams.md`](webhooks/ado_to_teams.md)

### 3. Human Input Hook
**Direction:** ADO → Teams → ADO

When a pipeline agent needs a human decision, it posts a comment containing
`[TEAMS_INPUT_NEEDED]: {...}` to the ADO work item. The ADO "comment added" webhook
fires. The bot parses the JSON payload, identifies the correct Teams thread by WI ID,
sends the appropriate Adaptive Card, and waits for the user's response. When the user
responds, the bot posts the response back to ADO as a plain comment. The pipeline agent's
polling loop detects the new comment and resumes.

See: [`flows/human_input_flow.md`](flows/human_input_flow.md), [`hooks/input_needed_contract.md`](hooks/input_needed_contract.md)

---

## User → Bot Actions (10 total)

| # | Action | Trigger | What Happens |
|---|--------|---------|--------------|
| 1 | Start intake | User sends any new feature request message | Bot begins guided intake conversation |
| 2 | Provide requirement title | Text reply during intake step 1 | Bot captures title, advances to description |
| 3 | Provide description and acceptance criteria | Text reply during intake step 2 | Bot captures full requirement detail |
| 4 | Select priority | Dropdown on Intake Form card | Bot captures priority level |
| 5 | Confirm requirement | Click "Confirm" on Requirement Confirmation card | Bot creates ADO work item via API |
| 6 | Edit requirement | Click "Edit" on Requirement Confirmation card | Bot returns to intake step 1 |
| 7 | Respond to clarification (free text) | Text reply on Clarification card | Bot posts response as ADO comment |
| 8 | Select option on clarification | Click option button on Clarification card | Bot posts selected option as ADO comment |
| 9 | Status check — single | User types "status WI-{id}" | Bot queries ADO and returns Status card |
| 10 | Status check — all active | User types "status all" | Bot lists all active WIs for this Teams user |

---

## Bot → ADO Actions (6 total)

| # | Action | When | ADO Operation |
|---|--------|------|---------------|
| 1 | Create work item | After user confirms Requirement Confirmation card | POST new WI — type=Feature, state=New, tag=ai-pipeline-trigger |
| 2 | Post user's clarification response | After user responds to Clarification card | POST comment to WI containing `[TEAMS_INPUT_RESPONSE]` JSON |
| 3 | Post approval decision | After user acts on Approval card (human review cases) | POST comment with approval/rejection decision |
| 4 | Add retry tag | After user clicks Retry on Failure/Retry card | PATCH WI — add tag=pipeline-retry |
| 5 | Add abort tag | After user clicks Abandon on Failure/Retry card | PATCH WI — add tag=pipeline-abort |
| 6 | Query work item state | When user requests status | GET WI by ID, read state and tags |

---

## ADO → Bot Webhook Events (9 total)

| # | Event | ADO Hook Type | Trigger Condition | Bot Action |
|---|-------|--------------|-------------------|------------|
| 1 | Work item created | `workitem.created` | Any new WI with ai-pipeline-trigger tag | Open Teams thread, send WI-created notification |
| 2 | Pipeline activated | `workitem.updated` | State: New → Active | Send "Clarification agent started" notification |
| 3 | Work item state changed | `workitem.updated` | Any state field change | Map state to pipeline stage; send stage notification |
| 4 | Comment added | `workitem.commented` | Any comment posted to WI | Inspect for `[TEAMS_INPUT_NEEDED]`; if found, send Clarification card; otherwise log |
| 5 | Work item tagged | `workitem.updated` | Tag field changes | If PIPELINE_FAILED tag added, send Failure/Retry card |
| 6 | Pull request created | `git.pullrequest.created` | PR opened on feature branch by Supervisor | Send "PR created" notification with PR link |
| 7 | Pull request merged | `git.pullrequest.merged` | PR auto-merged to main | Send Run Summary card; mark thread complete |
| 8 | Pull request awaiting review | `git.pullrequest.updated` | Draft PR converted to ready, or PR review requested | Send Approval card to user |
| 9 | Work item closed | `workitem.updated` | State changes to Done or Closed | Send Run Summary card if not already sent |

---

## Bot → User Notifications (15 total)

| # | Notification | Trigger Event | Format |
|---|-------------|--------------|--------|
| 1 | Work item created | `workitem.created` webhook | "WI-{id} created. The pipeline is starting. [View in ADO]({link})" |
| 2 | Clarification agent started | State → Active | "Agent 1 (Clarification) is reviewing your requirements." |
| 3 | Clarification needs human input | `[TEAMS_INPUT_NEEDED]` comment from Clarification agent | Clarification Adaptive Card with question and options |
| 4 | Clarification hard blocked | PIPELINE_FAILED with reason=clarification_score<50 | "Requirements are too vague to proceed. See the questions below." + failure detail |
| 5 | User stories created | Story Writer agent comment posted | "Agent 2 created {n} user stories in ADO." |
| 6 | Low-level design produced | Spec agent comment posted | "Agent 3 produced the low-level design. Frontend and backend work is starting." |
| 7 | Frontend code written | Frontend agent comment posted | "Agent 4 committed {n} file(s) to branch {branch}." |
| 8 | Backend code written | Backend agent comment posted | "Agent 5 committed {n} file(s). API contracts validated." or "No backend changes required." |
| 9 | Tests running | Test agent started comment | "Agent 6 is generating and running tests." |
| 10 | Tests self-correcting | Test agent correction round comment | "Agent 6 is fixing {n} failing test(s) — round {r}/5." |
| 11 | Tests passed | Test agent final pass comment | "All tests passed. Coverage: {pct}% on changed files." |
| 12 | Audit score posted | Audit agent comment posted | "Audit score: {score}/10. {n} finding(s). {merge_recommendation}." |
| 13 | Auto-merged | `git.pullrequest.merged` webhook | Run Summary card: "WI-{id} is complete. PR #{pr} merged to main." |
| 14 | Human review required | `git.pullrequest.created` (draft) webhook | Approval card: "Score {score}/10. A human must review PR #{pr} before it can merge." |
| 15 | Pipeline failed | PIPELINE_FAILED tag added to WI | Failure/Retry card with audit score, blocking findings, and Retry / Abandon actions |

---

## Adaptive Card Types (7 total)

| # | Card | Spec File | When Shown | Key Actions |
|---|------|----------|-----------|-------------|
| 1 | Intake Form | [`adaptive_cards/intake_form.md`](bot/adaptive_cards/intake_form.md) | User starts a new request | Multi-step: title, description, criteria, priority; Submit |
| 2 | Requirement Confirmation | [`adaptive_cards/requirement_confirmation.md`](bot/adaptive_cards/requirement_confirmation.md) | After intake complete | Confirm / Edit |
| 3 | Clarification Card | [`adaptive_cards/clarification_card.md`](bot/adaptive_cards/clarification_card.md) | Agent posts `[TEAMS_INPUT_NEEDED]` | Free text input or option buttons; Submit |
| 4 | Approval Card | [`adaptive_cards/approval_card.md`](bot/adaptive_cards/approval_card.md) | Supervisor: score 7.0–7.99 | Approve (merge) / Reject / View PR |
| 5 | Failure/Retry Card | [`adaptive_cards/failure_retry_card.md`](bot/adaptive_cards/failure_retry_card.md) | PIPELINE_FAILED | Retry / View Report / Abandon |
| 6 | Status Card | [`adaptive_cards/status_card.md`](bot/adaptive_cards/status_card.md) | User types "status WI-{id}" | Read-only; View in ADO link |
| 7 | Run Summary Card | [`adaptive_cards/run_summary_card.md`](bot/adaptive_cards/run_summary_card.md) | After auto-merge or pipeline end | Read-only final summary |

---

## Full Bot Lifecycle — One Work Item, Start to Finish

```
1. USER → BOT
   User sends: "I want to add a dark/light mode toggle to the app"
   Bot detects intake intent.
   Bot sends: Intake Form card.

2. USER fills Intake Form
   Title:               "Dark/Light Mode Toggle"
   Description:         "Users should switch between dark and light themes..."
   Acceptance Criteria: "Toggle in navbar, preference persists across sessions"
   Priority:            High
   Bot shows: Requirement Confirmation card.

3. USER clicks "Confirm"
   Bot → ADO: POST work item
     type=Feature, state=New, tag=ai-pipeline-trigger
     title="Dark/Light Mode Toggle"
   ADO returns: WI-542
   Bot → User: "WI-542 created. Pipeline is starting. [View in ADO]"
   Bot creates Teams thread keyed to WI-542.

4. ADO WEBHOOK → BOT (workitem.updated: state=Active)
   Bot → User (thread WI-542): "Agent 1 is reviewing your requirements."

5. Clarification Agent scores 67 (below 80 threshold).
   Agent posts to ADO: comment containing [TEAMS_INPUT_NEEDED] JSON
     question: "Where should the toggle be placed in the UI?"
     options: ["Top-right of navbar", "Settings page only", "Both locations"]

   ADO WEBHOOK → BOT (workitem.commented)
   Bot parses [TEAMS_INPUT_NEEDED].
   Bot → User (thread WI-542): Clarification card with question and three option buttons.

6. USER clicks "Top-right of navbar"
   Bot → ADO: POST comment "[TEAMS_INPUT_RESPONSE] {\"answer\": \"Top-right of navbar\"}"

7. Orchestrator detects new comment; Clarification Agent re-runs.
   Agent scores 88. Pipeline proceeds.
   ADO WEBHOOK → BOT (workitem.commented: clarification passed)
   Bot → User: "Requirements confirmed. Moving to story writing."

8. Story Writer creates 3 ADO User Stories.
   ADO WEBHOOK → BOT (workitem.commented: story_writer done)
   Bot → User: "Agent 2 created 3 user stories."

9. Spec Agent produces LLD.
   ADO WEBHOOK → BOT
   Bot → User: "Agent 3 produced the low-level design."

10. Frontend Agent writes code; commits to feature/542-dark-light-mode-toggle.
    ADO WEBHOOK → BOT
    Bot → User: "Agent 4 committed 5 file(s) to branch feature/542-dark-light-mode-toggle."

11. Backend Agent skips (no backend changes in LLD).
    ADO WEBHOOK → BOT
    Bot → User: "No backend changes required for this work item."

12. Test Agent runs.
    ADO WEBHOOK → BOT
    Bot → User: "Agent 6 is generating and running tests."
    [Test Agent encounters 2 failing tests, runs self-correction round 1]
    ADO WEBHOOK → BOT
    Bot → User: "Agent 6 is fixing 2 failing test(s) — round 1/5."
    [Tests pass after round 1]
    Bot → User: "All tests passed. Coverage: 81% on changed files."

13. Audit Agent scores 8.6/10; no blocking findings.
    ADO WEBHOOK → BOT
    Bot → User: "Audit score: 8.6/10. 1 low-severity finding. Merge approved."

14. Supervisor auto-merges PR #89 to main.
    ADO state → Done.
    ADO WEBHOOK → BOT (git.pullrequest.merged + workitem.updated state=Done)
    Bot → User (thread WI-542): Run Summary card
      "WI-542 complete. PR #89 merged to main. Feature: Dark/Light Mode Toggle.
       Audit: 8.6/10 | Tests: 24 passed | Coverage: 81%"
    Thread marked complete.
```

---

## Platform Decision (TBD)

Two implementation approaches are under consideration. Both are fully compatible with
the contracts and flows defined in this document; the design is platform-agnostic.

### Option A: Power Automate + Azure Bot Service

**Pros:**
- Low-code webhook routing in Power Automate; minimal infrastructure
- Native Microsoft 365 integration; Adaptive Cards work out of the box in Teams
- Lower operational overhead (no application server to manage)
- Faster initial implementation for teams without bot development experience

**Cons:**
- Complex JSON parsing and threading logic are awkward in Power Automate
- State management (WI-ID → Teams thread ID mapping) requires an external store
  (Dataverse or SharePoint), adding a dependency
- Power Automate flow runs are billed per execution, which can add up
- Bot Framework is still needed for command handling ("status all", "abort WI-42")

### Option B: Azure Bot Framework + Azure Functions

**Pros:**
- Full programmatic control over bot logic, state, and conversation management
- Bot Framework SDK handles Teams channel protocol; Functions handle inbound webhooks
- Clean testability; no platform-specific flow engine constraints
- State stored in CosmosDB or Azure Table Storage — purpose-built, low latency

**Cons:**
- More infrastructure (App Service or Container Apps + Function App)
- Higher implementation complexity; requires Bot Framework SDK knowledge
- Longer time to first working prototype

**Decision:** TBD. All flows, card specs, and contracts in this folder are defined at the
behavior level and apply equally to either option.

---

## What Is NOT in Scope

The following are explicitly outside the Teams Integration and will not be modified:

- `pipeline/orchestrator/` — the orchestrator and state machine
- `pipeline/agents/` — all eight agent implementations
- `pipeline/prompts/` — agent system prompts
- `pipeline/contracts/` — inter-agent Pydantic models
- `pipeline/mcp-servers/` — the ADO MCP server
- `demo-app/frontend/` and `demo-app/backend/` — application source code
- ADO work item type, state machine, or field definitions
- GitHub integration, PR creation, merge rules
- Audit scoring weights and thresholds
- CHANGELOG.md auto-update logic

Changes to individual agents that add `[TEAMS_INPUT_NEEDED]` comment posting are
Phase 4 work and are tracked separately. Phase 1 (this folder) is documentation and
contracts only — no Python, TypeScript, or C# files are created.

---

---

## Phase Status

### Phase 1 — Documentation and Contracts ✓ Complete
All flows, webhook specs, adaptive card specs, and inter-agent contracts documented.
No code written. See all files in this `teams/` folder.

### Phase 2 — Intake Bot (Copilot Studio + Power Automate) ✓ In Progress

**Platform confirmed:** Microsoft Copilot Studio (Teams-embedded) + Power Automate  
**Copilot Studio environment:** SDLC Bot  
**ADO project:** `https://dev.azure.com/nainika-dev/sdlc-agent`

Phase 2 implements the **Intake Hook** only: user messages in Teams → guided conversation
→ ADO work item created with `ai-pipeline-trigger` tag → pipeline starts.

Notify Hook (ADO → Teams notifications) and Human Input Hook ([TEAMS_INPUT_NEEDED]
handling) are Phase 3 and Phase 4 work respectively.

**Build guides for Phase 2:**

| File | What it covers |
|------|---------------|
| [`build-guides/phase2-copilot-studio-setup.md`](build-guides/phase2-copilot-studio-setup.md) | Step-by-step: create agent, topics, Adaptive Cards, test in Copilot Studio |
| [`build-guides/phase2-power-automate-flow.md`](build-guides/phase2-power-automate-flow.md) | Step-by-step: create the "SDLC - Create ADO Work Item" Power Automate flow |
| [`build-guides/phase2-adaptive-card-json.md`](build-guides/phase2-adaptive-card-json.md) | Full Adaptive Card JSON for Requirement Confirmation card and WI Created Success card |
| [`build-guides/phase2-teams-deployment.md`](build-guides/phase2-teams-deployment.md) | Publish agent, enable Teams channel, deploy to SDLC Bot team, end-to-end test checklist |

**Platform decision — resolved:**

The Phase 1 README listed Power Automate + Azure Bot Service and Azure Bot Framework as
options. Phase 2 confirms: **Copilot Studio (Teams-embedded) + Power Automate**.

- Copilot Studio handles the bot conversation logic, topic routing, and Adaptive Card rendering.
- Power Automate handles the ADO REST API call (HTTP Premium connector).
- No Azure Bot Framework SDK, no custom server infrastructure, no code deployment.

### Phase 3 — Notify Hook (Planned)
ADO service hook webhooks → Power Automate flows → Teams notifications.
All 15 notification types defined in [`flows/notify_flow.md`](flows/notify_flow.md).

### Phase 4 — Human Input Hook (Planned)
Agent `[TEAMS_INPUT_NEEDED]` comment → Adaptive Card → user response → ADO comment.
Contract defined in [`hooks/input_needed_contract.md`](hooks/input_needed_contract.md).
Requires updating three agents: Clarification, Story Writer, Supervisor.

---

*See [`pipeline/execution_guides/`](../pipeline/execution_guides/) for full agent specifications.*  
*Last updated: 2026-05-21*
