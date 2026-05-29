# Adaptive Card: Run Summary Card

## Purpose

Shown at the end of a pipeline run — either after a successful auto-merge or after the
pipeline is abandoned (Abandon action on Failure/Retry card). Provides a read-only
final summary of the complete pipeline run. This is the last card posted to a WI thread.

---

## Variants

### Variant A — Successful Auto-Merge (green)

**Header:** `Pipeline Complete — WI-{wi_id}` (green styling)

**Sub-header:** `Merged to main  ·  {total_duration}`

**Body section — Feature Summary:**

```
Feature: {wi_title}
Work Item: WI-{id}
Merged: {merge_timestamp}
PR: #{pr_id}  →  main
Branch: {branch_name}
```

**Body section — Pipeline Results:**

```
Pipeline Results:

  Agent 1 — Clarification     ✓  Passed (score: {score}/100)
  Agent 2 — Story Writer       ✓  {n} stories created
  Agent 3 — Spec Agent         ✓  LLD produced
  Agent 4 — Frontend           ✓  {n} file(s) committed
  Agent 5 — Backend            ✓  {n} file(s) committed  (or: Skipped)
  Agent 6 — Test               ✓  {passed}/{total} tests passed
  Agent 7 — Audit              ✓  Score: {composite}/10
  Agent 8 — Supervisor         ✓  Auto-merged
```

**Body section — Test and Audit Highlights:**

```
Tests:     {passed} passed  ·  {skipped} skipped  ·  Coverage: {pct}%
Audit:     {composite}/10  ·  {n} finding(s)  ·  {n} corrected by agents
Duration:  {total_duration}  (from WI creation to merge)
```

**Body section — Files Changed:**

```
Files changed ({n} total):
  {file_1}
  {file_2}
  {file_3}
  ...  (first 5 shown)
  {+ n more — see PR for full diff}
```

---

### Variant B — Failed / Abandoned (red)

**Header:** `Pipeline Ended — WI-{wi_id}` (red/neutral styling)

**Sub-header:** `{outcome_display}  ·  {failure_timestamp}`

Outcome display:
- `PIPELINE_FAILED — {failure_reason_display}`
- `Abandoned by {user}`

**Body section — Feature Summary:**

```
Feature: {wi_title}
Work Item: WI-{id}
Ended: {failure_timestamp}
Failed at: {agent_display_name}
```

**Body section — What Was Completed:**

```
Completed stages:
  ✓  Agent 1 — Clarification
  ✓  Agent 2 — Story Writer
  ✗  Agent 3 — Spec Agent  (failed here)
```

**Body section — Reason:**

```
Failure reason: {failure_reason_display}
{failure_message — truncated to 200 chars}

See full report in ADO for details.
```

---

## Buttons / Actions

All buttons on the Run Summary card are informational links only. No pipeline state
changes can be triggered from this card.

| Button | Label | Shown when | Action |
|--------|-------|-----------|--------|
| Link | `View PR ↗` | Variant A only (after merge) | Opens merged GitHub PR |
| Link | `View in ADO ↗` | Always | Opens ADO work item |
| Link | `View Audit Report ↗` | Variant A only | Opens audit report file in ADO or outputs/ |
| Link | `View Failure Report ↗` | Variant B only | Opens failure report in ADO |

No Retry button is shown on the Run Summary card. Retry is offered only on the
Failure/Retry card that precedes the Run Summary.

---

## Data Required to Render

### Variant A (successful)

```json
{
  "outcome": "auto_merged",
  "wi_id": "WI-542",
  "wi_title": "Dark/Light Mode Toggle",
  "pr_id": 89,
  "pr_url": "https://github.com/{owner}/{repo}/pull/89",
  "branch_name": "feature/542-dark-light-mode-toggle",
  "merge_timestamp": "2026-05-20T15:50:00Z",
  "total_duration_minutes": 110,
  "pipeline_stages": [
    { "agent": "clarification_agent", "status": "complete", "detail": "score: 88/100" },
    { "agent": "story_writer_agent", "status": "complete", "detail": "3 stories" },
    { "agent": "spec_agent", "status": "complete", "detail": "LLD produced" },
    { "agent": "frontend_agent", "status": "complete", "detail": "5 files" },
    { "agent": "backend_agent", "status": "skipped", "detail": "no backend changes" },
    { "agent": "test_agent", "status": "complete", "detail": "24/24 passed, 81% coverage" },
    { "agent": "audit_agent", "status": "complete", "detail": "8.6/10" },
    { "agent": "supervisor_agent", "status": "complete", "detail": "auto-merged" }
  ],
  "test_summary": {
    "passed": 24,
    "failed": 0,
    "skipped": 1,
    "coverage_pct": 81
  },
  "audit_summary": {
    "composite_score": 8.6,
    "finding_count": 1,
    "blocking_findings": 0
  },
  "files_changed": [
    "demo-app/frontend/src/components/ThemeToggle.tsx",
    "demo-app/frontend/src/context/ThemeContext.tsx",
    "demo-app/frontend/src/utils/strings.ts",
    "demo-app/frontend/src/utils/constants.ts",
    "demo-app/frontend/src/__tests__/ThemeToggle.test.tsx"
  ],
  "ado_link": "https://dev.azure.com/{org}/{project}/_workitems/edit/542",
  "audit_report_link": "outputs/audit-reports/AuditReport_WI-542_dark-light-mode-toggle.md"
}
```

### Variant B (failed/abandoned)

```json
{
  "outcome": "pipeline_failed",
  "wi_id": "WI-542",
  "wi_title": "Dark/Light Mode Toggle",
  "failure_reason": "audit_blocking_finding",
  "failure_message": "A HIGH severity security finding was detected: hardcoded API key in ThemeContext.tsx line 14.",
  "failed_at_agent": "audit_agent",
  "failure_timestamp": "2026-05-20T15:30:00Z",
  "completed_stages": ["clarification_agent", "story_writer_agent", "spec_agent", "frontend_agent", "backend_agent", "test_agent"],
  "failed_stage": "audit_agent",
  "ado_link": "https://dev.azure.com/{org}/{project}/_workitems/edit/542",
  "failure_report_link": "outputs/audit-reports/AuditReport_WI-542_dark-light-mode-toggle.md"
}
```

---

## Post-Card Thread Behaviour

After the Run Summary card is posted:

- The bot marks the WI thread as `status: closed` in the bot state store.
- Subsequent ADO events for this WI are received and logged but no further cards are sent.
- The thread remains readable in Teams for historical reference.
- If the user later retries (from a separate Failure/Retry card), a new "Run resumed"
  message is posted to the same thread and the thread is re-opened.
