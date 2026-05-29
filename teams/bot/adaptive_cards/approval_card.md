# Adaptive Card: Approval Card

## Purpose

Shown when the Supervisor agent opens a draft pull request because the audit score
is 7.0–7.99 (or there are non-blocking findings that require human review). The user
must decide whether to approve the PR for merge, reject it, or view it in GitHub before
deciding.

This is the Teams-facing surface for the "HUMAN_REVIEW_PENDING" pipeline outcome.

---

## Elements Shown

**Header:** `Human Review Required — WI-{wi_id}`

**Sub-header (amber/warning colour):** `Audit score: {composite_score}/10 — Manual approval needed`

**Body section — Score Summary:**

```
Audit Score: {composite_score}/10

Category breakdown:
  Code Correctness    {score}/10
  Test Coverage       {score}/10
  Security            {score}/10
  Standards           {score}/10
  Spec Adherence      {score}/10
  Performance         {score}/10
  Documentation       {score}/10
```

**Body section — Findings (if any non-blocking findings exist):**

```
Findings ({n} total):
  [{severity}] {description}  ({file_path})
  [{severity}] {description}  ({file_path})
  ...
```

If there are no findings, this section is omitted.

**Body section — PR Details:**

```
Pull Request: #{pr_id} — {pr_title}
Branch: {source_branch}
Target: main
```

**Body section — What this means:**

```
The pipeline produced a score of {composite_score}/10.
Auto-merge requires 8.0 or higher with no blocking findings.

If you approve, the draft PR will be promoted and merged to main.
If you reject, the PR will be closed and the pipeline will be marked as failed.
```

---

## Buttons / Actions

| Button | Label | Colour | Action |
|--------|-------|--------|--------|
| Primary | `Approve — Merge to Main` | Green | Posts approval response to ADO; promotes draft PR |
| Secondary | `View Pull Request` | Blue/neutral | Opens PR URL in browser; card remains active |
| Destructive | `Reject` | Red | Posts rejection response to ADO; closes draft PR |

**Approve** and **Reject** are mutually exclusive. Once either is clicked:
- The card collapses to a static confirmation showing the decision and timestamp.
- The pipeline resumes based on the decision.

**View Pull Request** does not close the card; it simply opens the GitHub PR URL.

---

## Data Required to Render

```json
{
  "wi_id": "WI-542",
  "composite_score": 7.6,
  "category_scores": {
    "code_correctness": 8,
    "test_coverage": 7,
    "security": 9,
    "standards_compliance": 7,
    "spec_adherence": 8,
    "performance": 7,
    "documentation": 6
  },
  "findings": [
    {
      "severity": "medium",
      "description": "Function toggleTheme exceeds 50 line limit",
      "file_path": "demo-app/frontend/src/components/ThemeToggle.tsx"
    }
  ],
  "pr_id": 89,
  "pr_title": "[WI-542] Dark/Light Mode Toggle",
  "pr_url": "https://github.com/{owner}/{repo}/pull/89",
  "source_branch": "feature/542-dark-light-mode-toggle",
  "audit_timestamp": "2026-05-20T14:45:00Z"
}
```

All data is sourced from the `AuditReport` JSON and the PR event webhook payload.

---

## What the Bot Does with the User's Response

### On "Approve — Merge to Main"

1. Bot posts to ADO WI-{id}:
   ```
   [TEAMS_INPUT_RESPONSE]: {
     "answer": "approved",
     "wi_id": "WI-542",
     "agent": "supervisor_agent",
     "responded_by": "<Teams user display name>",
     "responded_at": "<ISO 8601 timestamp>"
   }
   ```
2. Bot (or Power Automate flow / Azure Function) calls the GitHub API to:
   - Convert draft PR to ready-for-review
   - Approve and merge the PR (using a configured service account with write access)
3. Card collapses to:
   ```
   ✓ Approved — WI-{id}
   PR #{pr_id} promoted and merged to main.
   Approved by {user} at {time}.
   [View merged PR ↗]
   ```
4. ADO WI state is updated to Done by the pipeline supervisor logic.

### On "Reject"

1. Bot posts to ADO WI-{id}:
   ```
   [TEAMS_INPUT_RESPONSE]: {
     "answer": "rejected",
     "wi_id": "WI-542",
     "agent": "supervisor_agent",
     "responded_by": "<Teams user display name>",
     "responded_at": "<ISO 8601 timestamp>"
   }
   ```
2. Bot (or pipeline logic) closes the draft PR with reason "Rejected by human reviewer."
3. ADO WI is tagged PIPELINE_FAILED.
4. Card collapses to:
   ```
   ✗ Rejected — WI-{id}
   PR #{pr_id} was closed.
   Rejected by {user} at {time}.
   ```
5. Failure/Retry card is sent separately in the thread.

### On approval timeout (48 hours, no response)

Bot posts `[TEAMS_INPUT_TIMEOUT]` to ADO. Draft PR remains open but is tagged with
`approval-timeout`. Bot posts in thread:
"The approval window for WI-{id} PR #{pr_id} has expired. The draft PR remains open
in GitHub — it can still be promoted manually."
