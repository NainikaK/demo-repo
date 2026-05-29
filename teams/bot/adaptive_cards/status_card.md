# Adaptive Card: Status Card

## Purpose

Shown in response to a user command ("status WI-{id}") or a "status all" query.
Presents a read-only point-in-time snapshot of the work item's current pipeline state.
The card is entirely informational — no actions change pipeline state.

---

## Single Work Item Status (status WI-{id})

**Header:** `WI-{id} — {title}`

**Sub-header:** `{current_stage}  ·  {state_display}  ·  {elapsed_time}`

State display mapping:

| ADO State | State display | Colour |
|-----------|-------------|--------|
| New | Queued | Grey |
| Active | In Progress | Blue |
| Testing | Testing | Blue |
| Blocked | Waiting for Input | Amber |
| Done | Complete | Green |
| Closed | Closed | Grey |
| PIPELINE_FAILED tag | Failed | Red |

Elapsed time: time since WI was created ("Running for 2h 14m" or "Completed 3h ago").

---

**Body — Pipeline Stage Progress:**

```
Pipeline Progress:

  ✓  Agent 1 — Clarification       Passed (score: {score}/100)
  ✓  Agent 2 — Story Writer        3 stories created
  ✓  Agent 3 — Spec Agent          LLD produced
  ►  Agent 4 — Frontend            In progress
  ·  Agent 5 — Backend             Pending
  ·  Agent 6 — Test                Pending
  ·  Agent 7 — Audit               Pending
  ·  Agent 8 — Supervisor          Pending
```

Stage status icons:
- `✓` = Completed successfully
- `✗` = Failed or blocked
- `►` = Currently running (or waiting for input)
- `·` = Not yet started

**Body — Human Input Pending (shown only if applicable):**

```
⏳ Waiting for your input:
"{question from [TEAMS_INPUT_NEEDED]}"

[Respond now →]
```

The `[Respond now →]` button opens the pending Clarification card directly.

**Body — Branch Info (shown after Frontend Agent starts):**

```
Branch: {branch_name}
```

**Body — Last Update:**

```
Last update: {relative_time}  ({absolute_timestamp})
```

---

## Buttons / Actions

| Button | Label | Available when | Action |
|--------|-------|---------------|--------|
| Link | `View in ADO ↗` | Always | Opens ADO work item in browser |
| Link | `View PR ↗` | After PR is created | Opens GitHub PR in browser |
| Action | `Respond now →` | When input pending | Scrolls to or opens the pending Clarification card |
| None | *(no destructive actions)* | — | Status card is read-only; Retry/Abandon are on the Failure card |

---

## "Status All" Variant

When the user types "status all", the bot returns a compact list card:

**Header:** `Active Work Items — {n} in progress`

**Body — compact list:**

```
WI-{id1}  {title1}
          Stage: {stage}  ·  {state_display}  ·  Running for {time}

WI-{id2}  {title2}
          Stage: {stage}  ·  {state_display}  ·  Running for {time}

...
```

Up to 10 work items are shown. If more than 10: "Showing 10 of {n}. View all in ADO."

**Buttons:**

| Button | Label | Action |
|--------|-------|--------|
| Per row | `WI-{id} details` | Sends a single-WI Status card for that WI |
| Link | `View all in ADO ↗` | Opens ADO board in browser |

---

## Data Required to Render

Single WI status card data:
```json
{
  "wi_id": "WI-542",
  "wi_title": "Dark/Light Mode Toggle",
  "ado_state": "Active",
  "ado_link": "https://dev.azure.com/{org}/{project}/_workitems/edit/542",
  "created_at": "2026-05-20T14:00:00Z",
  "pipeline_stages": [
    { "agent": "clarification_agent", "status": "complete", "detail": "score: 88/100" },
    { "agent": "story_writer_agent", "status": "complete", "detail": "3 stories created" },
    { "agent": "spec_agent", "status": "complete", "detail": "LLD produced" },
    { "agent": "frontend_agent", "status": "running", "detail": null },
    { "agent": "backend_agent", "status": "pending", "detail": null },
    { "agent": "test_agent", "status": "pending", "detail": null },
    { "agent": "audit_agent", "status": "pending", "detail": null },
    { "agent": "supervisor_agent", "status": "pending", "detail": null }
  ],
  "branch_name": "feature/542-dark-light-mode-toggle",
  "pr_id": null,
  "pr_url": null,
  "pending_input": null,
  "last_updated_at": "2026-05-20T14:22:00Z"
}
```

Data is assembled by the bot by querying ADO (work item fields + comments) and its own
state store (pipeline stage tracking). The bot caches this data for 30 seconds to avoid
excessive ADO API calls when the user sends rapid status queries.
