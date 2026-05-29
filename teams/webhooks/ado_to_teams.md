# ADO → Teams: Webhook Events and Bot Responses

## Overview

The Teams bot subscribes to ADO service hooks via HTTP POST webhooks. Each event
is routed to the Teams thread corresponding to the work item ID contained in the payload.
All notifications for a given work item appear in a single persistent thread.

The bot does not modify ADO state. It is a read-only consumer of ADO events with one
exception: when it posts `[TEAMS_INPUT_RESPONSE]` comments back to ADO on behalf of
users responding to Adaptive Cards.

---

## Threading Strategy

**One Teams thread per work item.** When the bot receives the first event for a WI, it
creates a new thread in the configured Teams channel and stores the mapping:

```
wi_id → { teams_thread_id, teams_channel_id, created_at, created_by }
```

All subsequent events for that WI post into the same thread. This gives each work item
a complete, self-contained audit trail in Teams.

If the bot receives an event for a WI with no existing thread (e.g. the WI was created
directly in ADO, not through Teams intake), it creates a new thread at that point.
The bot posts an informational header: "Pipeline started for WI-{id} — tracking begins here."

---

## Event Catalogue

### Event 1 — Work Item Created

**ADO Hook Type:** `workitem.created`

**Trigger:** A new ADO work item is created with the `ai-pipeline-trigger` tag.
This event fires immediately when the bot itself creates the WI via the Intake flow,
or when a human creates a WI directly in ADO with the tag.

**What the bot does:**
1. Checks whether a thread for this WI already exists (it will not exist for ADO-native creation).
2. Creates a new Teams thread.
3. Stores `wi_id → teams_thread_id` mapping in bot state store.
4. Posts notification 1 to the thread.

**Notification sent:**
```
WI-{id} created — "{title}"
Priority: {priority} | Type: {type}
The pipeline is starting. The Clarification Agent will review your requirements shortly.

[View in ADO ↗]
```

---

### Event 2 — Work Item State Changed (New → Active)

**ADO Hook Type:** `workitem.updated`

**Trigger:** The orchestrator picks up the WI and transitions it from state `New` to
`Active` (or equivalent "In Progress" state). This is the signal that Agent 1
(Clarification) has started.

**What the bot does:**
Posts notification 2 to the WI thread.

**Notification sent:**
```
Pipeline started for WI-{id}
Agent 1 (Clarification) is reviewing your requirements.
```

---

### Event 3 — Comment Added (General)

**ADO Hook Type:** `workitem.commented`

**Trigger:** Any comment is posted to the work item.

**What the bot does:**
1. Reads the full comment body.
2. Checks for the `[TEAMS_INPUT_NEEDED]:` prefix (see special handling below).
3. If not a `[TEAMS_INPUT_NEEDED]` comment, checks if the comment was posted by a
   pipeline service account. If so, maps the comment to a notification type based on
   known agent comment patterns (see Pattern Mapping table below).
4. Posts the appropriate notification to the WI thread.
5. Ignores comments posted by human users (not service accounts) to prevent loops.

**Agent Comment Pattern Mapping:**

| Comment contains | Pipeline stage | Notification sent |
|-----------------|----------------|-------------------|
| `story_writer: complete` | Story Writer done | Notification 5 (stories created) |
| `spec_agent: complete` | Spec Agent done | Notification 6 (LLD produced) |
| `frontend_agent: complete` | Frontend Agent done | Notification 7 (frontend committed) |
| `backend_agent: complete` or `backend_agent: skipped` | Backend Agent done | Notification 8 (backend done or skipped) |
| `test_agent: running` | Test Agent started | Notification 9 (tests running) |
| `test_agent: correction_round` | Self-correction | Notification 10 (fixing tests) |
| `test_agent: complete` | Tests passed | Notification 11 (tests passed) |
| `audit_agent: complete` | Audit done | Notification 12 (audit score) |
| `[TEAMS_INPUT_NEEDED]:` | Human input required | Clarification card (see below) |
| `[PIPELINE_FAILED]` | Pipeline failure | Failure/Retry card |

Comment pattern matching is done by substring search on the comment body, not by
exact string match, to allow agents to include additional context.

---

### Event 4 — Comment Added: [TEAMS_INPUT_NEEDED] (Special Handling)

**ADO Hook Type:** `workitem.commented` (subset of Event 3)

**Trigger:** A comment is posted that starts with `[TEAMS_INPUT_NEEDED]: ` followed
by a valid JSON object. Full format spec: [`../hooks/input_needed_contract.md`](../hooks/input_needed_contract.md)

**What the bot does:**
1. Confirms the comment was posted by a pipeline service account (not a human).
2. Parses the JSON payload.
3. Validates required fields: `question`, `context`, `options`, `wi_id`, `agent`.
4. Looks up the Teams thread for `wi_id`.
5. Determines card variant:
   - `options` is a non-null array of 2–4 strings → send Clarification card with option buttons
   - `options` is null → send Clarification card with free-text input
6. Posts the Clarification card to the thread.
7. Starts the 24-hour timeout timer.

**Notification sent:** Clarification Adaptive Card (see [`../bot/adaptive_cards/clarification_card.md`](../bot/adaptive_cards/clarification_card.md))

**Error handling:**
- If JSON is invalid: bot posts "Could not parse the agent's question. Pipeline may be
  stalled — please check ADO directly." to the thread and logs the raw comment body.
- If `wi_id` does not match an existing thread: bot creates a new thread (same as Event 1
  fallback) and sends the card there.

---

### Event 5 — Work Item State Changed (Any State)

**ADO Hook Type:** `workitem.updated`

**Trigger:** The `System.State` field changes on the work item.

**What the bot does:**
Maps the new state value to a pipeline stage and posts the relevant notification.

**State → Notification Mapping:**

| New State | Pipeline Interpretation | Notification |
|-----------|------------------------|-------------|
| Active | Pipeline activated | Notification 2 (also covered by Event 2) |
| In Progress | Agent running | No new notification; rely on comment events |
| Testing | Test agent running | No new notification; rely on comment events |
| Done | Pipeline completed | Notification 13 (if PR already merged) or Run Summary card |
| Closed | Work item closed by human | "WI-{id} was closed manually. No further pipeline activity." |
| Blocked | Pipeline blocked | "WI-{id} is blocked. Check ADO for details." |

The bot de-duplicates: if a Run Summary card was already sent (e.g. from the PR merged
event), it does not send another one when state transitions to Done.

---

### Event 6 — Work Item Tagged

**ADO Hook Type:** `workitem.updated`

**Trigger:** The `System.Tags` field changes on the work item (a tag is added or removed).

**What the bot does:**
Scans the updated tag list for known pipeline signal tags.

**Tag → Action Mapping:**

| Tag added | Bot action |
|-----------|-----------|
| `PIPELINE_FAILED` | Send Failure/Retry card (notification 15) |
| `PIPELINE_AUTO_MERGED` | Send Run Summary card (if not already sent from PR event) |
| `PIPELINE_HUMAN_REVIEW` | Send Approval card (notification 14) |
| `pipeline-retry` | Post in thread: "Retry requested. Pipeline will resume shortly." |
| `pipeline-abort` | Post in thread: "Work item WI-{id} has been abandoned." |

---

### Event 7 — Pull Request Created

**ADO Hook Type:** `git.pullrequest.created`

**Trigger:** The Supervisor agent opens a pull request on the feature branch. This occurs
for both auto-merge candidates (score ≥ 8.0) and human review cases (score 7.0–7.99).

**What the bot does:**
1. Extracts the source branch name, which contains the WI ID (`feature/{wi_id}-{slug}`).
2. Looks up the Teams thread for the WI.
3. Checks whether the PR is a draft (human review case) or a normal PR (auto-merge path).
4. If draft PR: sends Approval card (notification 14) prompting user to approve or reject.
5. If normal PR: posts an informational message "PR #{pr_id} created — auto-merge in progress."

**Notification sent (auto-merge path):**
```
PR #{pr_id} opened for WI-{id}
Branch: {branch_name}
Auto-merge in progress. Waiting for status checks.
[View PR ↗]
```

**Notification sent (human review path):** Approval Adaptive Card
(see [`../bot/adaptive_cards/approval_card.md`](../bot/adaptive_cards/approval_card.md))

---

### Event 8 — Pull Request Merged

**ADO Hook Type:** `git.pullrequest.merged`

**Trigger:** The Supervisor agent successfully merges the PR to main (auto-merge path).

**What the bot does:**
1. Extracts the WI ID from the branch name.
2. Looks up the Teams thread.
3. Composes and sends a Run Summary card to the thread.
4. Marks the thread as complete in the bot state store (subsequent events for this WI
   are logged but no further cards are sent).

**Notification sent:** Run Summary card
(see [`../bot/adaptive_cards/run_summary_card.md`](../bot/adaptive_cards/run_summary_card.md))

---

### Event 9 — Pull Request Updated (Draft → Ready)

**ADO Hook Type:** `git.pullrequest.updated`

**Trigger:** A draft PR is converted to ready-to-review (e.g. a human manually promotes
the draft PR created by the Supervisor at score 7.0–7.99, or the Supervisor updates the
PR after conditions improve).

**What the bot does:**
Posts an informational update to the WI thread.

**Notification sent:**
```
PR #{pr_id} for WI-{id} is now ready for review.
Previously a draft — it is now open for merge.
[View PR ↗]
```

---

## Webhook Registration

ADO service hooks must be registered in the ADO project settings pointing to the bot's
inbound webhook URL. Required subscriptions:

| Subscription | Filter |
|-------------|--------|
| Work item created | Tag contains `ai-pipeline-trigger` |
| Work item updated | All work items in project |
| Work item commented | All work items in project |
| Pull request created | Repository: `{github_repo}` |
| Pull request updated | Repository: `{github_repo}` |
| Pull request merged | Repository: `{github_repo}` |

The inbound webhook endpoint is authenticated with a shared secret (HMAC-SHA256
signature on the request body). The bot rejects any payload with an invalid signature.

See [`webhook_payload_contracts.md`](webhook_payload_contracts.md) for the exact
JSON payload structure of each event.

---

## Idempotency

The bot must be idempotent: receiving the same webhook event twice must not produce
duplicate messages. Each incoming event is deduplicated using a composite key of
`{event_type}:{wi_id}:{event_timestamp}`. Seen keys are stored for 7 days.
