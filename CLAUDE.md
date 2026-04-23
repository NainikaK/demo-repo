# CLAUDE.md — AI-Powered SDLC Automation Pipeline

> This file is the single source of truth for the entire project. Every agent, every developer, and every tool working in this repository must reference this document before writing, editing, or reviewing any code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [End-to-End Pipeline Flow](#2-end-to-end-pipeline-flow)
3. [Agent Breakdown & Responsibilities](#3-agent-breakdown--responsibilities)
4. [MCP Integration — Azure DevOps](#4-mcp-integration--azure-devops)
5. [Tech Stack](#5-tech-stack)
6. [Repository & Folder Structure](#6-repository--folder-structure)
7. [Demo App](#7-demo-app)
8. [Coding Standards](#8-coding-standards)
9. [Audit Score Rubric](#9-audit-score-rubric)
10. [Agent Communication & Orchestration Protocol](#10-agent-communication--orchestration-protocol)
11. [GitHub Integration & Auto-Merge Rules](#11-github-integration--auto-merge-rules)

---

## 1. Project Overview

**Name:** AI-Powered SDLC Automation Pipeline

**Purpose:** Fully automate the software development lifecycle — from raw product requirements to a merged pull request — with zero human developer or tester involvement in the loop. A Product Owner writes a plain-English work item in Azure DevOps. The pipeline picks it up, refines it, writes code, tests it, audits it, and merges it automatically if quality thresholds are met.

**Core Principle:** Every agent in the pipeline is a specialist. No agent does work outside its defined boundary. The Orchestrator is the only agent that calls other agents. Agents communicate through structured JSON contracts, not free-form text.

**Non-Goal:** This pipeline does not replace Product Owners. Human intent still enters the system via ADO work items. The pipeline automates everything that happens *after* intent is captured.

---

## 2. End-to-End Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCT OWNER                                │
│   Creates plain-text work item in Azure DevOps                      │
│   Example: "Add a dark/light mode toggle to the app"                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  ADO Work Item (raw description)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                              │
│   • Polls ADO via MCP for new work items with status = "New"        │
│   • Triggers the Clarification Step                                 │
│   • On pass: decomposes into User Stories, updates ADO board        │
│   • On fail: writes clarification comment back to ADO item          │
│   • Drives the full agent pipeline sequentially                     │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       │  1. Clarification check passes
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLARIFICATION STEP                               │
│   Evaluates whether the requirement is specific enough to act on.   │
│   Produces: PASS (with structured spec) or FAIL (with questions)    │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       │  2. ADO board updated with User Stories
       ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│    FRONTEND AGENT            │   │        BACKEND AGENT             │
│    Writes React code         │   │        Writes .NET code          │
│    against the demo app      │   │        against the demo app      │
└──────────────┬───────────────┘   └─────────────────┬────────────────┘
               │                                     │
               └────────────────┬────────────────────┘
                                │  3. Code committed to feature branch
                                ▼
               ┌────────────────────────────────────┐
               │           TEST AGENT               │
               │  Writes unit + integration tests   │
               │  Runs the test suite               │
               │  Reports pass/fail + coverage      │
               └────────────────┬───────────────────┘
                                │  4. Test results attached to run
                                ▼
               ┌────────────────────────────────────┐
               │           AUDIT AGENT              │
               │  Reviews all code changes          │
               │  Scores against rubric (0–10)      │
               │  Produces structured audit report  │
               └────────────────┬───────────────────┘
                                │  5. Audit report produced
                                ▼
               ┌────────────────────────────────────┐
               │        SUPERVISOR AGENT            │
               │  Collects scores from all agents   │
               │  Checks composite score >= 9/10    │
               │  PASS → opens + auto-merges PR     │
               │  FAIL → files failure report       │
               └────────────────────────────────────┘
```

### Pipeline States

| State | Meaning |
|---|---|
| `PENDING_CLARIFICATION` | Work item picked up, clarification in progress |
| `CLARIFICATION_FAILED` | Requirements too vague; comment written back to ADO |
| `STORIES_CREATED` | ADO updated with User Stories; coding phase starting |
| `CODING_IN_PROGRESS` | Frontend and Backend agents writing code |
| `TESTING_IN_PROGRESS` | Test Agent running suite |
| `AUDIT_IN_PROGRESS` | Audit Agent scoring the changes |
| `SUPERVISOR_REVIEW` | Supervisor collecting scores |
| `AUTO_MERGED` | PR merged; ADO item closed |
| `PIPELINE_FAILED` | Score < 9 or critical failure; report filed |

---

## 3. Agent Breakdown & Responsibilities

### 3.1 Orchestrator Agent

**Role:** Central controller and state machine for the entire pipeline.

**Responsibilities:**
- Poll Azure DevOps via MCP for work items in `New` state
- Invoke the Clarification Step on each new work item
- If clarification score < 50: post clarifying questions to ADO, set item state to `Needs Info`, halt pipeline for that item
- If clarification score >= 50: invoke the ADO Story Writer to break the requirement into User Stories and update the ADO board
- Sequentially trigger each downstream agent in order: Frontend → Backend → Test → Audit → Supervisor
- Maintain a pipeline run record (JSON) tracking state, agent outputs, and timestamps
- Handle agent failures: log, mark pipeline as failed, notify via ADO comment

**Agent Timeout:** If any agent does not complete within 10 minutes, the Orchestrator kills the agent process, logs a timeout failure, marks the pipeline as `PIPELINE_FAILED`, and posts a timeout comment to the ADO work item.

**Retry Mechanism:** If an agent fails (error or timeout), the Orchestrator retries it up to 2 times with a 30-second wait between attempts. If the agent fails all 3 attempts (original + 2 retries), the pipeline is marked as failed.

**Status Notifications:** At every pipeline state transition, the Orchestrator emits a structured status update containing:
- `phase`: current pipeline phase name
- `active_agent`: which agent is currently running
- `progress`: e.g., `3/7 agents complete`
- `timestamp`: ISO 8601

Status updates are printed to the terminal in structured format and written to the pipeline run record.

**Inputs:** Raw ADO work item (ID, title, description)
**Outputs:** Pipeline run record JSON, ADO board updates, final GitHub PR link

**Must NOT:** Write any application code, write any tests, make any merge decisions.

---

### 3.2 Clarification Agent (Clarification Step)

**Role:** Quality gate on incoming requirements. Returns a confidence score that determines how the pipeline proceeds.

**Responsibilities:**
- Analyze the work item description for: scope clarity, acceptance criteria, affected areas (frontend/backend/both), edge cases
- Return a confidence score from 0 to 100 reflecting how actionable the requirement is
- Identify gaps — information that is missing or had to be assumed — and include them in the output
- Produce a structured specification for any score >= 50, even if incomplete
- For any score < 100, produce a list of specific questions for the Product Owner

**Confidence Score Tiers:**

| Score Range | Action |
|---|---|
| **>= 80** | Proceed automatically with the full pipeline |
| **50 – 79** | Post clarifying questions as an ADO comment, but continue the pipeline with what is known. Flag spec as `partial_confidence = true` |
| **< 50** | Halt pipeline completely. Post clarifying questions to ADO. Set work item state to `Needs Info` |

**Scoring Guidance:** Start at 100. Deduct for each issue found: unidentifiable feature area (−30), no derivable acceptance criterion (−30), ambiguous pronouns or references (−15 each instance), unbounded scope (−20).

**Structured Spec Schema:**
```json
{
  "work_item_id": "string",
  "title": "string",
  "summary": "string",
  "confidence_score": 0,
  "partial_confidence": false,
  "gaps": ["string"],
  "affected_areas": ["frontend" | "backend" | "both"],
  "acceptance_criteria": ["string"],
  "out_of_scope": ["string"],
  "suggested_user_stories": ["string"]
}
```

**Inputs:** Raw work item description string
**Outputs:** `{ confidence_score: number, spec?: StructuredSpec, questions?: string[] }`

**Must NOT:** Write code, update ADO, make architectural decisions.

---

### 3.3 ADO Story Writer (sub-step within Orchestrator)

**Role:** Translates the structured spec into formal User Stories on the ADO board.

**Responsibilities:**
- Take the structured spec from the Clarification Agent
- Create child User Stories under the parent work item in ADO via MCP
- Each User Story follows the format: `As a [user], I want [feature], so that [benefit]`
- Attach acceptance criteria to each story
- Set story state to `Ready for Development`
- Link stories back to the parent work item

**User Story Rules:**
- Maximum one area of concern per story (no combined frontend+backend stories unless tightly coupled)
- Each story must have at least one acceptance criterion
- Stories must be independently deliverable where possible

**Story Point Estimation:** Estimate the complexity of each User Story using the Fibonacci scale (1, 2, 3, 5, 8). Attach the estimate to the story as the Story Points field in ADO. Base estimates on: scope of change, number of affected files, and whether new patterns or dependencies are being introduced.

**Dependency Detection:** Before creating stories, scan the existing demo app codebase (read-only) for any prerequisite functionality the new stories depend on. If a dependency does not yet exist in the codebase, flag it explicitly in the story description with a `[DEPENDENCY MISSING: <description>]` tag and note what needs to exist first.

**Duplicate Check:** Before creating each story, query existing ADO work items via `ado_get_work_items` for similar titles or descriptions. If a potential duplicate is found (overlapping title or acceptance criteria), flag it in the new story description with a `[POSSIBLE DUPLICATE: #<id>]` tag rather than silently skipping or blocking creation.

**Inputs:** `StructuredSpec` from Clarification Agent, ADO project details, current demo app codebase (read-only)
**Outputs:** Created ADO User Story IDs with story points attached, updated ADO board state

---

### 3.4 Frontend Agent

**Role:** Writes all React/TypeScript code changes required by the feature.

**Responsibilities:**
- Read the structured spec and all relevant User Stories
- Read the current state of the demo app frontend codebase before writing anything
- Implement the required UI changes in the demo app
- Follow all coding standards defined in Section 8
- Write clean, typed, component-level React code
- Perform a self-review before committing (see below)
- Commit changes to a feature branch (branch naming: `feature/<work-item-id>-<slug>`)
- Produce a change summary: files modified, components added/changed, dependencies added, visual description

**Self-Review Step:** Before committing, the agent re-reads every file it has written or modified and checks each change line-by-line against the coding standards in Section 8. Any violation found must be fixed before the commit proceeds. The self-review outcome — either a list of violations found and corrected, or a clean result — must be logged in the change summary.

**Dependency Justification:** If a new npm package is required, the change summary must include:
- Why the package is needed and what problem it solves
- At least two alternatives that were considered and why they were not chosen
- The chosen package and the specific reason it was selected

**Visual Description:** The change summary must include a plain-English description of what the UI change looks like and how a user interacts with it (e.g., "A toggle button appears in the top-right corner of the header. Clicking it switches the app between a dark background with light text and a light background with dark text. The selected theme persists across page navigations."). This description is attached to the ADO work item as a comment.

**Constraints:**
- Only modify files under `demo-app/frontend/`
- Do not modify backend code, test files, or CI configuration
- Do not install new npm packages without flagging them in the change summary
- TypeScript strict mode must be satisfied — no `any` types without explicit justification

**Inputs:** Structured spec, User Stories, current frontend codebase
**Outputs:** Committed frontend code on feature branch, change summary JSON (includes self-review log, dependency justification if applicable, visual description)

---

### 3.5 Backend Agent

**Role:** Writes all .NET C# code changes required by the feature.

**Responsibilities:**
- Read the structured spec and all relevant User Stories
- Read the current state of the demo app backend codebase before writing anything
- Implement required API or business logic changes in the demo app
- Follow all coding standards defined in Section 8
- Write clean, typed, well-structured .NET code
- Perform a self-review before committing (see below)
- Commit changes to the same feature branch as the Frontend Agent
- Produce a change summary: files modified, endpoints added/changed, packages added

**Self-Review Step:** Before committing, the agent re-reads every file it has written or modified and checks each change line-by-line against the coding standards in Section 8. Any violation found must be fixed before the commit proceeds. The self-review outcome — either a list of violations found and corrected, or a clean result — must be logged in the change summary.

**API Contract Validation:** For every new or modified endpoint, the agent must read the Frontend Agent's change summary and verify an exact match on: HTTP method, path, request body shape, and response shape. If a mismatch is found, the Backend Agent must resolve it before committing — either by adjusting the endpoint to match what the frontend expects, or by flagging a contract conflict in the change summary for the Orchestrator to surface.

**Dependency Justification:** If a new NuGet package is required, the change summary must include:
- Why the package is needed and what problem it solves
- At least two alternatives that were considered and why they were not chosen
- The chosen package and the specific reason it was selected

**Constraints:**
- Only modify files under `demo-app/backend/`
- Do not modify frontend code, test files, or CI configuration
- Do not add NuGet packages without flagging them in the change summary
- All public methods must have XML doc comments

**Inputs:** Structured spec, User Stories, current backend codebase, Frontend Agent's change summary (for API contract validation)
**Outputs:** Committed backend code on feature branch, change summary JSON (includes self-review log, API contract validation result, dependency justification if applicable)

---

### 3.6 Test Agent

**Role:** Writes and executes tests for the changes introduced by the Frontend and Backend agents.

**Responsibilities:**
- Read the change summaries from Frontend and Backend agents
- Write tests according to the specific rules below
- Run the full test suite and capture results
- Produce a test report: total tests, passed, failed, skipped, coverage %

**Test Coverage Requirement:** Minimum 70% line coverage on changed files.

**Per-Function Rule:** For every new or modified function or method (frontend or backend), write:
- One happy path test verifying the expected output for valid input
- One failure or edge case test verifying correct behavior for invalid, null, or boundary input

**Per-API-Endpoint Rule:** For every new or modified API endpoint, write one test per HTTP status code that endpoint can return. For example: if an endpoint can return 200, 400, and 404, write three tests — one for each status code.

**Per-React-Component Rule:** For every new React component, write exactly three tests:
1. **Render test** — the component renders without crashing given valid props
2. **Interaction test** — a user interaction (click, type, or select) produces the expected result
3. **Edge case test** — the component handles empty, null, or unexpected props without crashing

**Integration Test Rule:** An integration test is defined as: the frontend calls the actual backend API endpoint (not a mock) and receives the correct response shape and HTTP status code. Write at least one integration test per acceptance criterion in the structured spec.

**Constraints:**
- Only modify files under `demo-app/frontend/src/__tests__/` and `demo-app/backend/tests/`
- Tests must be deterministic — no time-dependent, order-dependent, or network-dependent tests without explicit mocking
- Do not modify application source code to make tests pass

**Inputs:** Change summaries from Frontend + Backend agents, current test suite
**Outputs:** Committed test files, test run results JSON (pass/fail/coverage)

---

### 3.7 Audit Agent

**Role:** Independent code reviewer that scores all pipeline output against defined standards.

**Responsibilities:**
- Review all code changes on the feature branch (diff from `main`)
- Score the changes against the rubric in Section 9
- Produce a structured audit report with per-category scores and specific findings
- Flag any blocking issues (security vulnerabilities, broken contracts, missing tests)

**Audit Scope:**
- Frontend code quality and standards compliance
- Backend code quality and standards compliance
- Test coverage and quality
- Security (no hardcoded secrets, no XSS vectors, no injection risks)
- Adherence to the structured spec and acceptance criteria
- **Performance:** Flag synchronous operations inside React renders, N+1 query patterns in backend code, and unbounded list rendering without pagination
- **DRY Violations:** Flag any logic that appears in more than one place and should be extracted to a shared hook, utility function, or service
- **Dead Code:** Flag unused imports, unused functions, and unreachable code blocks
- **Bundle Size Awareness:** Flag any frontend import that pulls in an entire library when only one function is needed (e.g., `import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`)
- **API Versioning:** Flag any new backend endpoint that is not under a versioned route prefix (minimum `/api/v1/`)

**Inputs:** Full diff of the feature branch vs. `main`, test results JSON, structured spec
**Outputs:** Audit report JSON (see rubric in Section 9)

**Must NOT:** Modify any code. Read-only agent.

---

### 3.8 Supervisor Agent

**Role:** Final decision-maker. Collects all scores and determines whether the PR is auto-merged.

**Responsibilities:**
- Receive the audit report from the Audit Agent
- Receive the test results from the Test Agent
- Compute the composite pipeline score
- If composite score >= 8.0 and no blocking findings: open a GitHub PR and auto-merge it
- If composite score is between 7.0 (inclusive) and 8.0 (exclusive): open a draft PR and post a comment to the ADO work item flagging it for optional human review with the full audit report attached (human approval escape hatch)
- If composite score < 7.0 or any blocking finding exists: produce a failure report detailing which categories fell short, update the ADO work item with the failure reason, set pipeline state to `PIPELINE_FAILED`
- On successful auto-merge: generate or append to `CHANGELOG.md` with a plain-English entry describing what was added or changed
- After merging: run the demo app's baseline test suite. If any previously passing test now fails, automatically revert the merge, post a rollback notice to the ADO work item, and set pipeline state to `PIPELINE_FAILED`
- Update the ADO work item to `Done` on successful merge only if post-merge baseline tests pass
- Close the pipeline run record

**Merge Rules:**
- Composite score must be >= 8.0 / 10.0
- All tests must pass (0 failing tests)
- No blocking audit findings (severity = CRITICAL or HIGH)
- Branch must be up to date with `main` before merge

**Human Approval Escape Hatch:** If composite score is between 7.0 and 8.0 (inclusive of 7.0, exclusive of 8.0):
- Open a draft PR (not merged)
- Post an ADO comment with the full audit report and a note that the pipeline paused for optional human review
- Pipeline does not auto-fail — a human may manually promote the draft PR if they choose to accept the quality trade-off

**Changelog Generation:** On every successful auto-merge, the Supervisor Agent appends an entry to `CHANGELOG.md` at the repository root. The entry must include: the date, the work item ID, the feature title, and a plain-English description of what changed (derived from the structured spec and Frontend/Backend agent change summaries).

**Rollback Trigger:** After merging to `main`, the Supervisor Agent re-runs the demo app's pre-existing baseline test suite (all tests that were passing before this pipeline run). If any test that previously passed now fails: revert the merge via `git revert`, push the revert commit to `main`, post a rollback notice to the ADO work item, and set pipeline state to `PIPELINE_FAILED`.

**Inputs:** Audit report, test results, pipeline run record
**Outputs:** Merged GitHub PR (or draft PR or failure report), updated ADO work item, `CHANGELOG.md` update on merge, closed pipeline run record

---

## 4. MCP Integration — Azure DevOps

The Orchestrator Agent connects to Azure DevOps via an MCP (Model Context Protocol) server. This MCP server exposes ADO operations as tools that agents can call.

### MCP Server Location
`pipeline/mcp-servers/ado-mcp/`

### Required MCP Tools (ADO)

| Tool Name | Description |
|---|---|
| `ado_get_work_items` | Fetch work items by state, type, or project |
| `ado_get_work_item_by_id` | Fetch a single work item by ID |
| `ado_update_work_item` | Update fields on a work item (state, description, etc.) |
| `ado_create_work_item` | Create a new work item (User Story, Bug, Task) |
| `ado_add_comment` | Add a comment to a work item |
| `ado_link_work_items` | Create a parent-child or related link between items |

### ADO Configuration (environment variables)

```
ADO_ORG_URL=https://dev.azure.com/nainika-dev
ADO_PROJECT=sdlc-agent
ADO_PAT=<personal-access-token>          # stored in .env, never committed
ADO_WORK_ITEM_POLL_INTERVAL_SECONDS=60
ADO_TRIGGER_TAG=ai-pipeline              # work items must have this tag to be picked up
```

### Trigger Mechanism

The Orchestrator polls ADO every `ADO_WORK_ITEM_POLL_INTERVAL_SECONDS` for work items that:
1. Are of type `Feature` or `User Story`
2. Have state `New`
3. Are tagged with `ai-pipeline`

This tag-based trigger ensures only explicitly opted-in work items enter the automated pipeline.

---

## 5. Tech Stack

### Pipeline (Agents & Orchestration)

| Component | Technology |
|---|---|
| Agent framework | Claude API (Anthropic) via `claude-sonnet-4-6` |
| Orchestration runtime | Python 3.12 |
| MCP server (ADO) | Python — `mcp` SDK (`modelcontextprotocol/python-sdk`) |
| Inter-agent contracts | JSON Schema validated Pydantic models |
| Pipeline state store | Local JSON files (dev) → upgrade path to a DB |
| GitHub integration | `PyGithub` or `gh` CLI |
| Environment config | `python-dotenv` + `.env` file |

### Demo App — Frontend

| Component | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build tool | Vite |
| Styling | Tailwind CSS |
| State management | React Context / Zustand (lightweight) |
| Testing | Vitest + React Testing Library |
| Linting | ESLint + Prettier |

### Demo App — Backend

| Component | Technology |
|---|---|
| Framework | .NET 8 (ASP.NET Core Web API) |
| Language | C# 12 |
| ORM | Entity Framework Core |
| Testing | xUnit + Moq |
| API docs | Swagger / OpenAPI |
| Linting | `dotnet format` + Roslyn analyzers |

---

## 6. Repository & Folder Structure

```
sdlc-ai-pipeline/
│
├── CLAUDE.md                          # ← You are here. Source of truth.
├── README.md                          # Brief public-facing overview
├── .env.example                       # Template for required env vars (no secrets)
├── .gitignore
│
├── pipeline/                          # All agent and orchestration code
│   ├── orchestrator/
│   │   ├── main.py                    # Entry point — starts polling loop
│   │   ├── state_machine.py           # Pipeline state management
│   │   └── run_record.py              # Pipeline run record schema + persistence
│   │
│   ├── agents/
│   │   ├── clarification_agent.py     # Clarification Step agent
│   │   ├── story_writer_agent.py      # ADO User Story creator
│   │   ├── frontend_agent.py          # React code writer
│   │   ├── backend_agent.py           # .NET code writer
│   │   ├── test_agent.py              # Test writer + runner
│   │   ├── audit_agent.py             # Code auditor + scorer
│   │   └── supervisor_agent.py        # Score collector + merge decider
│   │
│   ├── mcp-servers/
│   │   └── ado-mcp/
│   │       ├── server.py              # MCP server exposing ADO tools
│   │       ├── ado_client.py          # Azure DevOps REST API wrapper
│   │       └── tools/                 # One file per MCP tool definition
│   │
│   ├── contracts/
│   │   ├── structured_spec.py         # Pydantic model: StructuredSpec
│   │   ├── audit_report.py            # Pydantic model: AuditReport
│   │   ├── test_results.py            # Pydantic model: TestResults
│   │   ├── change_summary.py          # Pydantic model: ChangeSummary
│   │   └── pipeline_run.py            # Pydantic model: PipelineRun
│   │
│   ├── prompts/                       # System prompt templates for each agent
│   │   ├── orchestrator.md
│   │   ├── clarification.md
│   │   ├── story_writer.md
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── test.md
│   │   ├── audit.md
│   │   └── supervisor.md
│   │
│   └── utils/
│       ├── github_client.py           # GitHub PR creation + merge helpers
│       ├── git_utils.py               # Branch creation, commit, push helpers
│       └── logger.py                  # Structured logging
│
├── demo-app/                          # The real React + .NET app agents work on
│   ├── frontend/                      # React 18 + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── context/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── __tests__/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── backend/                       # .NET 8 ASP.NET Core Web API
│       ├── src/
│       │   ├── Controllers/
│       │   ├── Services/
│       │   ├── Models/
│       │   ├── Data/
│       │   └── Middleware/
│       ├── tests/
│       │   ├── Unit/
│       │   └── Integration/
│       └── DemoApp.sln
│
└── runs/                              # Pipeline run records (gitignored in prod)
    └── .gitkeep
```

---

## 7. Demo App

The demo app is a lightweight full-stack application that exists solely to give agents real code to read, edit, test, and commit against. It is **not** the product — it is the test subject.

### Purpose
- Agents need a realistic codebase with components, API endpoints, state, and tests
- The demo app provides a living, evolving target that grows as features are added by the pipeline
- It must be simple enough to onboard quickly but realistic enough to exercise all agent responsibilities

### Initial Feature Set (seed state)
The demo app starts with a minimal but working application:
- A basic React frontend with a header, a home page, and one or two UI components
- A .NET backend with at least one REST endpoint the frontend calls
- A working test suite with at least one test per layer

Agents will expand the demo app feature by feature as ADO work items flow through the pipeline.

### Demo App Rules
- The demo app must always be in a runnable state on `main`
- Agents must never break the existing test suite when adding new features
- All changes to the demo app go through the full pipeline (no direct commits to `main`)

---

## 8. Coding Standards

All agents producing code must follow these standards. The Audit Agent scores against them.

### 8.1 Universal Standards (all code)

- No hardcoded secrets, API keys, tokens, or credentials — ever
- No commented-out dead code committed to the repository
- All public interfaces must be explicitly typed — no implicit `any` (TS) or untyped parameters (C#)
- Functions and methods must do one thing (Single Responsibility)
- Maximum function length: 50 lines. If longer, it must be split
- No magic numbers or strings — use named constants
- Error paths must be handled; silent catch blocks are a violation
- All environment-specific configuration comes from environment variables
- **DRY Enforcement:** No logic may be duplicated across more than one file. Any repeated pattern must be extracted to a shared hook, utility function, or service before committing
- **Dead Code Prohibition:** No unused imports, no unused variables, and no unreachable code blocks — these are treated as standards violations and will be flagged by the Audit Agent

### 8.2 Frontend Standards (React / TypeScript)

- Functional components only — no class components
- Props must have explicit TypeScript interfaces, never inline object types on the component signature
- Hooks must follow the Rules of Hooks with no conditional hook calls
- Component files: one component per file, file named after the component (`PascalCase.tsx`)
- State that is shared across more than two components must use Context or a state manager
- No inline styles — use Tailwind utility classes
- All user-facing strings must be externalized (no literal UI text inside JSX logic)
- `useEffect` dependencies array must be complete and correct
- Accessibility: all interactive elements must have `aria-label` or visible label text
- **Bundle Size Awareness:** Import only what is used from any library — never import an entire library when a single function is needed (e.g., use `import debounce from 'lodash/debounce'`, not `import _ from 'lodash'`)

### 8.3 Backend Standards (.NET / C#)

- Follow Microsoft's C# coding conventions and naming guidelines
- All controllers must be thin — business logic lives in Services, not Controllers
- Services must be injected via interfaces (Dependency Injection), not instantiated directly
- All public methods must have XML doc comments (`/// <summary>`)
- Use `async`/`await` throughout — no `.Result` or `.Wait()` blocking calls
- Entities must not be returned directly from API endpoints — use DTOs
- All database operations go through the repository pattern
- HTTP status codes must be semantically correct (200, 201, 400, 404, 409, 500)
- Never swallow exceptions — log and re-throw or return a structured error response
- **API Versioning Requirement:** All backend API endpoints must be under a versioned path prefix. Minimum version is `/api/v1/`. Unversioned endpoints are a standards violation

### 8.4 Test Standards

- Test names must follow the pattern: `MethodName_Scenario_ExpectedResult`
- One assertion focus per test — test one behavior, not multiple
- No tests that depend on external network calls without explicit mocking
- Tests must clean up after themselves — no shared mutable state between tests
- Coverage of happy path AND at least one failure/edge case per feature
- Test files must be co-located in their designated test directories (see folder structure)

---

## 9. Audit Score Rubric

The Audit Agent scores each pipeline run on a scale of **0–10**. The Supervisor Agent requires a composite score of **>= 8.0** to auto-merge. Scores between 7.0 and 8.0 trigger the human approval escape hatch.

The composite score is a weighted sum of the categories below.

### Scoring Categories

| # | Category | Weight | Max Points |
|---|---|---|---|
| 1 | Code Correctness | 20% | 2.0 |
| 2 | Standards Compliance | 15% | 1.5 |
| 3 | Test Coverage & Quality | 20% | 2.0 |
| 4 | Security | 20% | 2.0 |
| 5 | Spec Adherence | 10% | 1.0 |
| 6 | Performance | 10% | 1.0 |
| 7 | Documentation | 5% | 0.5 |
| | **Total** | **100%** | **10.0** |

### Category Definitions

**1. Code Correctness (2.0 pts)**
- Does the code do what the spec says it should?
- Are there obvious bugs, null reference risks, or logic errors?
- Does the application still build and run after the changes?
- Scoring: 2.0 = no issues, 1.5 = minor issues, 1.0 = notable bugs, 0 = broken build or critical logic failure

**2. Standards Compliance (1.5 pts)**
- Does all code follow the standards in Section 8?
- Are naming conventions, file structure, and patterns consistent with the existing codebase?
- Includes DRY enforcement, dead code prohibition, API versioning, and bundle size awareness
- Scoring: 1.5 = full compliance, 1.0 = 1–2 minor violations, 0.5 = multiple violations, 0 = systematic non-compliance

**3. Test Coverage & Quality (2.0 pts)**
- Are all acceptance criteria covered by at least one test?
- Is line coverage on changed files >= 70%?
- Are the per-function, per-endpoint, and per-component test rules from Section 3.6 satisfied?
- Are tests well-structured and meaningful (not just coverage farming)?
- Scoring: 2.0 = all rules satisfied, >= 70% coverage, quality tests; 1.0 = some coverage gaps or missing rule-required tests; 0 = missing tests or < 50% coverage

**4. Security (2.0 pts)**
- No hardcoded secrets or credentials
- No XSS vulnerabilities (React output escaping respected)
- No SQL injection risks (parameterized queries / EF used correctly)
- No insecure direct object references
- No sensitive data exposed in API responses
- Scoring: 2.0 = no issues, 1.0 = low-severity finding, 0 = any HIGH or CRITICAL finding (also blocks merge regardless of score)

**5. Spec Adherence (1.0 pts)**
- Does the implementation match every acceptance criterion from the structured spec?
- Is anything in scope missing from the implementation?
- Is anything out of scope included?
- Scoring: 1.0 = all criteria met, nothing missing; 0.5 = minor gaps; 0 = acceptance criteria unmet or significant scope creep

**6. Performance (1.0 pts)**
- No synchronous operations blocking React renders
- No N+1 query patterns in backend code
- No unbounded list rendering without pagination
- Scoring: 1.0 = no issues found, 0.5 = one minor finding, 0 = multiple findings or one severe finding

**7. Documentation (0.5 pts)**
- README updated if the feature changes user-facing behavior or setup steps
- Swagger/OpenAPI docs present on all new backend endpoints
- `CHANGELOG.md` entry generated on merge (handled by Supervisor Agent)
- Scoring: 0.5 = all documentation present, 0.25 = partial documentation, 0 = documentation missing

### Audit Report Schema

```json
{
  "pipeline_run_id": "string",
  "work_item_id": "string",
  "composite_score": 0.0,
  "merge_recommendation": "APPROVE | HUMAN_REVIEW | REJECT",
  "blocking_findings": [],
  "categories": {
    "code_correctness": { "score": 0.0, "max": 2.0, "findings": [] },
    "standards_compliance": { "score": 0.0, "max": 1.5, "findings": [] },
    "test_coverage": { "score": 0.0, "max": 2.0, "findings": [] },
    "security": { "score": 0.0, "max": 2.0, "findings": [] },
    "spec_adherence": { "score": 0.0, "max": 1.0, "findings": [] },
    "performance": { "score": 0.0, "max": 1.0, "findings": [] },
    "documentation": { "score": 0.0, "max": 0.5, "findings": [] }
  },
  "summary": "string"
}
```

### Blocking Findings

Regardless of composite score, the following findings **always block the merge**:
- Any security finding with severity `CRITICAL` or `HIGH`
- A failing test suite (any test in a `FAILED` state)
- A build failure in either frontend or backend
- A missing acceptance criterion (spec adherence score = 0)

---

## 10. Agent Communication & Orchestration Protocol

### Principle: Structured JSON Contracts

Agents do not pass free-form text to each other. Every inter-agent handoff uses a Pydantic-validated JSON contract defined in `pipeline/contracts/`. The Orchestrator is responsible for passing the correct contract to each agent and validating the output before passing it downstream.

### Agent Invocation Pattern

Each agent is implemented as a Python function with the signature:

```python
async def run(input: AgentInput, claude_client: Anthropic) -> AgentOutput:
    ...
```

Agents use the Claude API with:
- Model: `claude-sonnet-4-6`
- Tool use: each agent is given only the tools it needs (MCP tools for Orchestrator, git tools for Frontend/Backend, etc.)
- System prompt: loaded from `pipeline/prompts/<agent-name>.md`
- Every agent call logs its full input/output to the pipeline run record

### Error Handling Protocol

1. If an agent raises an exception: the Orchestrator catches it, logs the error, sets pipeline state to `PIPELINE_FAILED`, and posts a comment to the ADO work item
2. If an agent returns a `FAIL` verdict (e.g., Clarification fails): the Orchestrator follows the defined FAIL path (post questions to ADO, halt)
3. No agent silently swallows errors — all failures propagate up to the Orchestrator

---

## 11. GitHub Integration & Auto-Merge Rules

### Branch Naming Convention

```
feature/<work-item-id>-<kebab-case-slug>
```
Example: `feature/4821-dark-light-mode-toggle`

### PR Creation

The Supervisor Agent creates the PR via the GitHub API with:
- Title: `[<work-item-id>] <spec title>`
- Body: auto-generated from the audit report and change summaries
- Labels: `ai-generated`, `pipeline-approved`
- Linked ADO work item reference

### Auto-Merge Conditions (all must be true)

1. Composite audit score >= 8.0
2. Zero failing tests
3. No blocking audit findings
4. Branch is up to date with `main`
5. All GitHub status checks pass (if CI is configured)

### On Merge

- ADO work item state set to `Done` (only after post-merge baseline tests pass)
- `CHANGELOG.md` updated with a plain-English entry for the feature
- Pipeline run record saved to `runs/` with state `AUTO_MERGED`
- Feature branch deleted after merge

### On Human Approval Escape Hatch (score 7.0 – 7.99)

- Draft PR opened (not merged)
- PR body contains the full audit report
- ADO work item receives a comment with the audit report and a note that optional human review is needed
- Pipeline does not fail — a human may promote the draft PR manually

### On Failure (score < 7.0 or blocking finding)

- PR is opened as a draft (not merged)
- PR body contains the full audit report
- ADO work item state set to `In Review` with a comment explaining the failure
- Pipeline run record saved with state `PIPELINE_FAILED`

---

*Last updated: 2026-04-23*
*This document must be updated whenever the pipeline architecture, agent responsibilities, tech stack, or standards change. No agent should act on information not reflected here.*
