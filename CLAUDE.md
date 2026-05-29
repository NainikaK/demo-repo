# AI-Powered SDLC Automation Pipeline

## Overview

This project fully automates the software development lifecycle from a plain-English
Azure DevOps work item to a merged GitHub pull request. A Product Owner creates a work
item tagged `ai-pipeline-trigger`. Eight specialised Claude agents then run sequentially:
clarifying requirements, writing ADO user stories, producing a low-level design,
generating React and .NET code, running and self-correcting tests, auditing code quality,
and merging the PR if the composite audit score reaches 8.0 / 10.0. No human developer
or tester is in the loop.

---

## Pipeline Flowchart

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Azure DevOps Work Item                          │
│         type: Feature | User Story · state: New                     │
│                   tag: ai-pipeline-trigger                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  Orchestrator polls ADO every 60 s
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 1 · Clarification Agent                                       │
│  · Scores requirement clarity 0–100                                  │
│  · < 50  → PIPELINE_FAILED (hard block, posts questions to ADO)      │
│  · 50–79 → blocks & posts clarifying questions; waits for PO update  │
│  · ≥ 80  → proceeds                                                  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ StructuredSpec JSON
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 2 · Story Writer Agent                                        │
│  · Creates ADO User Stories from StructuredSpec                      │
│  · Assigns Fibonacci story points (1, 2, 3, 5, 8)                   │
│  · Writes exactly 4 Gherkin scenarios per story                      │
│    (happy path · error · edge case · boundary)                       │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ User Stories → ADO; StructuredSpec continues
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 3 · Spec Agent                                                │
│  · Produces Low Level Design (LLD) JSON blueprint                    │
│  · Defines components, hooks, API endpoints, DTOs                    │
│  · LLD is the single source of truth for both code agents            │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ LLDDocument JSON
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 4 · Frontend Agent                                            │
│  · Creates feature branch  feature/<id>-<slug>                       │
│  · Writes React/TypeScript under demo-app/frontend/ only             │
│  · Self-reviews against coding standards before committing           │
│  · Produces ChangeSummary (files created/modified, visual desc.)     │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ ChangeSummary (frontend)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 5 · Backend Agent                                             │
│  · Writes .NET C# under demo-app/backend/ only                       │
│  · Validates API contracts against the frontend ChangeSummary        │
│  · If mismatches found → applies corrections and re-validates        │
│  · Skips entirely when LLD requires no backend changes               │
│  · Produces ChangeSummary (backend)                                  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ Both ChangeSummaries + LLD
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 6 · Test Agent                                                │
│                                                                      │
│  Phase A — Isolation cleanup                                         │
│  · Strips foreign describe() blocks from all existing test files     │
│  · Deletes stale test files for changed source files                 │
│                                                                      │
│  Phase B — Generation                                                │
│  · Calls Claude to generate frontend (.test.tsx/.test.ts) and        │
│    backend (.cs) tests covering all changed files                    │
│  · Strips foreign describe() blocks from every generated file        │
│    before writing to disk                                            │
│  · Falls back to split frontend/backend calls if JSON is too large   │
│                                                                      │
│  Phase C — Execution                                                 │
│  · Runs Vitest (frontend) and dotnet test (backend)                  │
│                                                                      │
│  Phase D — Self-correction (frontend)                                │
│  · Up to 5 correction rounds total                                   │
│  · Per-file cap: 3 corrections; file deleted if still failing        │
│  · Strips foreign describe() blocks after each correction            │
│  · Failure → file mapped to correct test file by describe-name       │
│    (fallback: full it-name substring search)                         │
│                                                                      │
│  Phase E — Self-correction (backend)                                 │
│  · Up to 5 correction rounds; stuck files deleted after 2 no-change  │
│                                                                      │
│  Returns TestResults → if any test still fails → orchestrator retry  │
└──────────────────────────┬───────────────────────────────────────────┘
              ┌────────────┘
              │  Orchestrator retry logic (MAX_AGENT_RETRIES = 2)
              │  On failure: runs Diagnosis Agent → builds retry context
              │  → re-runs Test Agent with diagnosis attached
              │  After 2 retries exhausted → PIPELINE_FAILED
              └────────────┐
                           │ TestResults
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 7 · Audit Agent                                               │
│  · Scores changes 0–10 across 7 weighted categories:                 │
│                                                                      │
│    Category              Weight   Max pts                            │
│    ──────────────────    ──────   ───────                            │
│    code_correctness       20 %     2.0                               │
│    test_coverage          20 %     2.0                               │
│    security               20 %     2.0                               │
│    standards_compliance   15 %     1.5                               │
│    spec_adherence         10 %     1.0                               │
│    performance            10 %     1.0                               │
│    documentation           5 %     0.5                               │
│                                            Total max: 10.0           │
│                                                                      │
│  · CRITICAL/HIGH findings block merge regardless of composite score  │
│  · spec_adherence = 0 → automatic CRITICAL finding                   │
│  · Outputs AuditReport + saves to outputs/audit-reports/             │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ AuditReport (composite score + findings)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT 8 · Supervisor Agent                                          │
│                                                                      │
│  · Composite ≥ 8.0 + no CRITICAL/HIGH                                │
│    → rebases branch onto main → creates PR → auto-merges             │
│    → updates CHANGELOG.md                                            │
│                                                                      │
│  · Composite 7.0–7.99 or non-blocking findings                       │
│    → opens draft PR → human promotes manually                        │
│                                                                      │
│  · Composite < 7.0 or any CRITICAL/HIGH finding                      │
│    → PIPELINE_FAILED → posts failure report to ADO work item         │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
    AUTO_MERGED    HUMAN_REVIEW_PENDING   PIPELINE_FAILED
   (PR merged to    (draft PR open,       (report posted
      main)          human decides)        to ADO item)
```

---

## Agent Sequence

| # | Agent | Responsibility |
|---|---|---|
| 1 | Clarification | Scores requirement clarity 0–100; hard blocks at < 50, posts questions and blocks at 50–79, proceeds at ≥ 80 |
| 2 | Story Writer | Creates ADO User Stories with exactly 4 Gherkin scenarios and Fibonacci story points |
| 3 | Spec Agent | Produces a Low Level Design (LLD) JSON blueprint for both code agents |
| 4 | Frontend Agent | Writes React/TypeScript under `demo-app/frontend/`; self-reviews against standards before commit |
| 5 | Backend Agent | Writes .NET C# under `demo-app/backend/`; validates API contracts against frontend summary; retries on mismatches |
| 6 | Test Agent | Writes and runs tests; strips foreign describe blocks; auto-corrects failures (max 5 rounds, 3 per file) |
| 7 | Audit Agent | Scores changes 0–10 across 7 weighted categories; flags CRITICAL/HIGH findings |
| 8 | Supervisor | Merges at ≥ 8.0; draft PR at 7.0–7.99; failure report at < 7.0 or any blocking finding |

---

## Audit Scoring

| Category | Weight | Max |
|---|---|---|
| `code_correctness` | 20% | 2.0 |
| `test_coverage` | 20% | 2.0 |
| `security` | 20% | 2.0 |
| `standards_compliance` | 15% | 1.5 |
| `spec_adherence` | 10% | 1.0 |
| `performance` | 10% | 1.0 |
| `documentation` | 5% | 0.5 |

**Blocking rules (regardless of composite score):**
- Any finding with severity `CRITICAL` or `HIGH` → merge blocked
- `spec_adherence` score of 0 → automatic `CRITICAL` finding

---

## References

| What you need | Where to look |
|---|---|
| How each agent works (inputs, outputs, rules) | [`pipeline/execution_guides/`](pipeline/execution_guides/) |
| Agent system prompts (loaded at runtime) | [`pipeline/prompts/`](pipeline/prompts/) |
| Frontend coding standards | [`.claude/rules/frontend-standards.md`](.claude/rules/frontend-standards.md) |
| Backend coding standards | [`.claude/rules/backend-standards.md`](.claude/rules/backend-standards.md) |
| Testing standards | [`.claude/rules/testing-standards.md`](.claude/rules/testing-standards.md) |
| Anti-patterns (what never to do) | [`.claude/rules/anti-patterns.md`](.claude/rules/anti-patterns.md) |
| Security documentation | [`security/`](security/) |
| Output document templates | [`pipeline/templates/`](pipeline/templates/) |

---

## Operational Facts

**ADO trigger:** Work items must be type `Feature` or `User Story`, state `New`, and
tagged `ai-pipeline-trigger`.

**Branch naming:** `feature/<work-item-id>-<kebab-case-slug>`  
Example: `feature/4821-dark-light-mode-toggle`

**Audit thresholds:**

| Score | Outcome |
|---|---|
| ≥ 8.0, no CRITICAL/HIGH | Auto-merge to `main` |
| 7.0 – 7.99 | Draft PR opened; human promotes manually |
| < 7.0 or any CRITICAL/HIGH | `PIPELINE_FAILED` |

**Orchestrator retry:** Each agent phase allows up to **2 retries**. On failure, the
Diagnosis Agent runs first and attaches context before the next attempt.

**Test Agent self-correction limits:**
- Maximum **5 correction rounds** per test run
- Maximum **3 corrections per file** — file deleted if still failing after 3 attempts
- Stuck files (correction produces no change twice) are deleted immediately

**Environment variables (store in `.env`, never commit):**

```
ADO_ORG_URL=https://dev.azure.com/<your-org>
ADO_PROJECT=<your-project>
ADO_PAT=<your-personal-access-token>
ADO_WORK_ITEM_POLL_INTERVAL_SECONDS=60
ADO_TRIGGER_TAG=ai-pipeline-trigger
ANTHROPIC_API_KEY=<your-api-key>
GITHUB_PAT=<github-personal-access-token>
GITHUB_REPO=<owner/repo>
```

**Tech stack:**
- **Pipeline:** Python 3.12, Claude API (`claude-sonnet-4-6`), MCP SDK
- **Frontend:** React 18 + TypeScript (strict), Vite, Tailwind CSS, Vitest + RTL
- **Backend:** .NET 10, ASP.NET Core Web API, C# 12, xUnit + Moq

---

## Repository Structure

```
CLAUDE.md                      ← this file — project overview only
CHANGELOG.md                   ← auto-updated on every successful pipeline merge
.claude/rules/                 ← coding standards and anti-patterns
security/                      ← secrets, boundaries, and input validation docs
pipeline/
  orchestrator/                ← entry point (main.py) and state machine
  agents/                      ← one Python file per agent
  prompts/                     ← system prompt .md loaded by each agent at runtime
  contracts/                   ← Pydantic models for inter-agent JSON contracts
  utils/                       ← git, GitHub, logging, and diagnosis helpers
  mcp-servers/ado-mcp/         ← Azure DevOps MCP server
  execution_guides/            ← human-readable docs for each agent
  templates/                   ← audit criteria and test plan templates
demo-app/
  frontend/                    ← React 18 app (Frontend Agent writes here only)
  backend/                     ← .NET 10 API (Backend Agent writes here only)
outputs/
  audit-reports/               ← audit reports per pipeline run (gitignored)
  pr-descriptions/             ← PR descriptions per pipeline run (gitignored)
runs/                          ← pipeline run records (gitignored)
```

---

*Full agent specifications: [`pipeline/execution_guides/`](pipeline/execution_guides/)*  
*Last updated: 2026-05-20*

---

## Teams Integration

The `teams/` folder contains the full specification for a Microsoft Teams mediation
layer that sits in front of the pipeline. It is Phase 1 (documentation only) — no
pipeline agents, orchestrator logic, ADO work item handling, or application code is
modified.

**What the Teams layer is:** A pure UI and routing layer. Users interact with the
pipeline exclusively through Teams. The bot translates Teams messages into ADO work
items, forwards pipeline events back as notifications, and handles human-in-the-loop
decisions via Adaptive Cards.

**What is NOT changed:** The orchestrator, all eight agents, ADO work item logic, GitHub
integration, and all audit/merge rules remain exactly as documented above.

### Three Integration Points

| Hook | Direction | What it does |
|------|-----------|-------------|
| **Intake Hook** | Teams → ADO | Bot collects requirement details via guided conversation; creates ADO work item with `ai-pipeline-trigger` tag |
| **Notify Hook** | ADO → Teams | Bot receives ADO service hook webhooks; posts 15 types of pipeline notifications to the correct WI thread |
| **Human Input Hook** | ADO → Teams → ADO | Bot detects `[TEAMS_INPUT_NEEDED]` agent comments; sends Adaptive Cards to user; posts `[TEAMS_INPUT_RESPONSE]` back to ADO |

### Platform (confirmed Phase 2)

**Copilot Studio (Teams-embedded) + Power Automate.** No Azure Bot Framework, no custom server.

- Copilot Studio: conversation logic, topic routing, Adaptive Cards
- Power Automate: ADO REST API calls (HTTP Premium connector)
- Copilot Studio environment name: **SDLC Bot**
- ADO project: `https://dev.azure.com/nainika-dev/sdlc-agent`

### What is in teams/

```
teams/
├── README.md                           ← full design doc, architecture, phase status
├── build-guides/                       ← Phase 2 step-by-step implementation guides
│   ├── phase2-copilot-studio-setup.md  ← create agent, topics, Adaptive Cards in Copilot Studio
│   ├── phase2-power-automate-flow.md   ← build the "SDLC - Create ADO Work Item" flow
│   ├── phase2-adaptive-card-json.md    ← complete Adaptive Card JSON for both Phase 2 cards
│   └── phase2-teams-deployment.md      ← publish, deploy to Teams, end-to-end test checklist
├── bot/
│   ├── bot_agent.md                    ← bot responsibilities, commands, tone, state management
│   └── adaptive_cards/
│       ├── intake_form.md
│       ├── requirement_confirmation.md
│       ├── clarification_card.md
│       ├── approval_card.md
│       ├── failure_retry_card.md
│       ├── status_card.md
│       └── run_summary_card.md
├── webhooks/
│   ├── ado_to_teams.md                 ← all 9 ADO webhook events and bot responses
│   └── webhook_payload_contracts.md    ← exact ADO payload JSON for each event
├── flows/
│   ├── intake_flow.md                  ← user message → ADO work item created
│   ├── notify_flow.md                  ← all 15 notification types and sequencing
│   └── human_input_flow.md            ← [TEAMS_INPUT_NEEDED] → card → ADO response
└── hooks/
    └── input_needed_contract.md        ← exact [TEAMS_INPUT_NEEDED] comment format and rules
```

### Agents That Will Use [TEAMS_INPUT_NEEDED] (Phase 4)

The following agents currently handle human decisions without Teams awareness. In
Phase 4, each will be updated to post `[TEAMS_INPUT_NEEDED]` comments to ADO:

| Agent | Current behaviour | Phase 4 change |
|-------|-----------------|----------------|
| **Clarification Agent** (`pipeline/agents/clarification_agent.py`) | Posts plain clarifying questions to ADO when score is 50–79; orchestrator polls for PO update | Replace plain comment with `[TEAMS_INPUT_NEEDED]` JSON; resume on `[TEAMS_INPUT_RESPONSE]` |
| **Story Writer Agent** (`pipeline/agents/story_writer_agent.py`) | Posts `[DEPENDENCY MISSING]` and `[POSSIBLE DUPLICATE]` flags as plain comments; blocks pipeline | Replace flags with `[TEAMS_INPUT_NEEDED]` JSON with option choices |
| **Supervisor Agent** (`pipeline/agents/supervisor_agent.py`) | Opens draft PR at score 7.0–7.99; waits for human to manually promote via GitHub | Post `[TEAMS_INPUT_NEEDED]` comment; bot sends Approval card; merge decision returned via `[TEAMS_INPUT_RESPONSE]` |

No agent files are modified in Phase 1. The `[TEAMS_INPUT_NEEDED]` contract is defined
in [`teams/hooks/input_needed_contract.md`](teams/hooks/input_needed_contract.md).
