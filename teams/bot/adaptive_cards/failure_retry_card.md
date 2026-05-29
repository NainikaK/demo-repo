# Adaptive Card: Failure/Retry Card

## Purpose

Shown when the pipeline is marked PIPELINE_FAILED for any reason. Presents the failure
reason, audit findings (if applicable), and gives the user options to retry the pipeline,
view the full report in ADO, or abandon the work item.

---

## Elements Shown

**Header:** `Pipeline Failed — WI-{wi_id}` (red/error styling)

**Sub-header:** `{failure_reason_display}`

Failure reason display strings:

| `failure_reason` value | Display string |
|----------------------|----------------|
| `clarification_score_too_low` | "Requirements too vague — score {score}/100" |
| `clarification_timeout` | "Requirements clarification timed out" |
| `human_input_timeout` | "No response received — human input timeout" |
| `test_failures` | "Tests could not be corrected after 5 rounds" |
| `audit_score_too_low` | "Audit score {score}/10 — below 7.0 threshold" |
| `audit_blocking_finding` | "Blocking finding: {severity} severity issue found" |
| `supervisor_rejected` | "Rejected by human reviewer" |
| `max_retries_exhausted` | "Pipeline failed after 2 retry attempts" |
| Unknown | "Pipeline encountered an unexpected error" |

---

**Body section — Summary:**

```
Work Item: WI-{id} — {title}
Failed at: {agent_display_name}
Time: {failure_timestamp}
```

**Body section — Failure Detail (shown only when applicable):**

For `audit_score_too_low` or `audit_blocking_finding`:
```
Audit Score: {composite_score}/10  (threshold: 7.0)

Blocking Findings:
  [{severity}] {description}  ({file_path})
  ...

All Findings ({n} total):
  [{severity}] {description}
  ...
```

For `test_failures`:
```
Failing Tests ({n} total):
  {test_name}  —  {test_file}
  ...
  (first 5 shown; see full report in ADO)
```

For `clarification_score_too_low`:
```
Clarity Score: {score}/100  (threshold: 80)

Gaps identified:
  · {gap_1}
  · {gap_2}
  ...

Suggested improvements:
  · {suggestion_1}
  · {suggestion_2}
```

For all other failure reasons: show the raw `failure_message` string from the pipeline.

---

## Buttons / Actions

| Button | Label | Action |
|--------|-------|--------|
| Primary | `Retry Pipeline` | Posts `[TEAMS_INPUT_RESPONSE]` with `"answer": "retry"` to ADO; adds `pipeline-retry` tag; collapses card |
| Secondary | `View Full Report in ADO` | Opens ADO WI link in browser; card remains active |
| Destructive | `Abandon` | Posts `[TEAMS_INPUT_RESPONSE]` with `"answer": "abandon"` to ADO; adds `pipeline-abort` tag; closes thread |

**Retry** is available only when:
- `can_retry` = true in the failure payload
- The orchestrator's per-WI retry budget has not been exhausted (max 2 retries)

If `can_retry` is false, the Retry button is replaced with a disabled label:
"Retry not available — max retries reached."

---

## Data Required to Render

```json
{
  "wi_id": "WI-542",
  "wi_title": "Dark/Light Mode Toggle",
  "failure_reason": "audit_score_too_low",
  "failure_message": "Composite score 6.8/10 is below the 7.0 threshold for human review.",
  "failed_at_agent": "audit_agent",
  "failure_timestamp": "2026-05-20T15:30:00Z",
  "can_retry": true,
  "composite_score": 6.8,
  "blocking_findings": [
    {
      "severity": "high",
      "description": "Hardcoded API key found in ThemeContext.tsx",
      "file_path": "demo-app/frontend/src/context/ThemeContext.tsx",
      "line_number": 14
    }
  ],
  "all_findings": [...],
  "failing_tests": [],
  "ado_link": "https://dev.azure.com/{org}/{project}/_workitems/edit/542"
}
```

---

## What the Bot Does with the User's Response

### On "Retry Pipeline"

1. Bot posts to ADO WI-{id}:
   ```
   [TEAMS_INPUT_RESPONSE]: {
     "answer": "retry",
     "wi_id": "WI-542",
     "agent": "supervisor_agent",
     "responded_by": "<Teams user display name>",
     "responded_at": "<ISO 8601 timestamp>"
   }
   ```
2. Bot patches the ADO WI to add tag `pipeline-retry`.
3. Card collapses to: "Retry requested for WI-{id}. The pipeline will restart shortly."
4. Bot sends text message: "WI-{id} retry started. I'll keep you updated here."
5. Pipeline orchestrator detects the `pipeline-retry` tag and re-runs from the beginning
   (or from the configured retry checkpoint).

### On "Abandon"

1. Bot posts to ADO WI-{id}:
   ```
   [TEAMS_INPUT_RESPONSE]: {
     "answer": "abandon",
     "wi_id": "WI-542",
     "agent": "supervisor_agent",
     "responded_by": "<Teams user display name>",
     "responded_at": "<ISO 8601 timestamp>"
   }
   ```
2. Bot patches the ADO WI to add tag `pipeline-abort` and change state to Closed.
3. Card collapses to: "WI-{id} has been abandoned."
4. Bot marks the WI thread as closed in bot state store.

### On "View Full Report in ADO"

Bot simply opens the `ado_link`. The card remains active. The user can still choose
Retry or Abandon after reviewing the report.
