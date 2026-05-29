# Teams Bot — Behaviour Specification

## Overview

The Teams bot is the single interface between end users and the SDLC pipeline. It
handles incoming user messages, sends Adaptive Cards, processes ADO webhook events,
and posts responses back to ADO on behalf of users.

The bot does not contain pipeline logic. It is a routing and presentation layer only.

---

## Full Responsibilities

| Responsibility | Description |
|---------------|-------------|
| Intent detection | Classify incoming user messages as intake, command, or unknown |
| Guided intake | Run the four-step intake form conversation and create ADO work items |
| Thread management | Create and maintain one Teams thread per work item |
| Webhook consumption | Receive, validate, and route ADO service hook events |
| `[TEAMS_INPUT_NEEDED]` handling | Parse agent comments; send Clarification cards; post responses to ADO |
| Notification delivery | Send all 15 notification types to the correct WI thread |
| Status queries | Respond to "status WI-{id}" and "status all" commands |
| Timeout management | Send reminders and post timeout comments when users do not respond |
| State persistence | Maintain conversation state, WI-to-thread mappings, pending inputs |
| Error recovery | Handle ADO API failures, malformed payloads, and unknown events gracefully |

---

## Conversation State Management

**One thread per work item.** The bot maintains a state record for every active work
item it is tracking:

```json
{
  "wi_id": "WI-542",
  "teams_channel_id": "19:abc@thread.v2",
  "teams_thread_id": "19:xyz@thread.v2",
  "created_by_teams_user_id": "user-aad-guid",
  "created_by_display_name": "Jane Smith",
  "created_at": "2026-05-20T14:00:00Z",
  "status": "active",
  "current_stage": "frontend_agent",
  "pipeline_stages": { ... },
  "pending_input": {
    "comment_id": 1001,
    "agent": "clarification_agent",
    "question": "Where should the toggle be placed?",
    "options": ["Navbar", "Settings page", "Both"],
    "sent_at": "2026-05-20T14:05:00Z",
    "timeout_at": "2026-05-21T14:05:00Z"
  },
  "last_event_at": "2026-05-20T14:22:00Z"
}
```

State is persisted in an external store (CosmosDB or Azure Table Storage). It is not
held in memory; every bot restart reads from the store.

**Thread lifecycle:**
- `active` — pipeline is running; events are processed and notifications sent
- `awaiting_input` — a Clarification or Approval card is pending user response
- `closed` — pipeline ended (merged, failed, or abandoned); events logged but no cards sent
- `error` — bot encountered an unrecoverable state; human intervention required

---

## Commands

The bot recognises the following text commands. All commands are case-insensitive.

### `status WI-{id}`

**Example:** `status WI-542`, `Status wi-542`, `STATUS WI542`

**What the bot does:**
1. Extracts the numeric WI ID (with or without the "WI-" prefix).
2. Queries ADO for the current work item state and comments.
3. Reads pipeline stage data from bot state store.
4. Sends a Status card in the current channel or DM.

**Response on WI not found:**
"WI-{id} was not found. Please check the work item ID and try again."

**Response on WI not tracked by bot:**
"WI-{id} exists in ADO but is not being tracked by the pipeline bot.
If this WI has the ai-pipeline-trigger tag, add it manually and I will start tracking it."

---

### `status all`

**What the bot does:**
1. Queries bot state store for all WIs where:
   - `created_by_teams_user_id` matches the requesting user, AND
   - `status` is `active` or `awaiting_input`
2. Sends a compact Status card listing all matching WIs.
3. If zero active WIs: "You have no active pipeline work items. Send a message to create one."

---

### `abort WI-{id}` *(future scope — Phase 4)*

**What the bot will do (Phase 4):**
1. Confirm with user: "Are you sure you want to abort WI-{id} — {title}? [Yes, abort] [Cancel]"
2. On confirmation: posts `pipeline-abort` tag to ADO WI.
3. Sends Failure/Retry card with reason "Aborted by user."

**Current behaviour (Phase 1):** Bot responds "Abort is not yet available. To stop the pipeline,
please remove the `ai-pipeline-trigger` tag from the work item in ADO directly."

---

### `retry WI-{id}` *(future scope — Phase 4)*

**What the bot will do (Phase 4):**
Posts `pipeline-retry` tag to ADO WI, identical to clicking Retry on the Failure/Retry card.

**Current behaviour (Phase 1):** Bot responds "To retry, use the Retry button on the failure card
that was sent when the pipeline failed."

---

### `help`

**What the bot does:**
Sends a static help message:

```
SDLC Pipeline Bot — Commands

  status WI-{id}    Show status of a specific work item
  status all        Show all your active work items

To create a new feature request, just describe what you want to build.

Need help? Contact your pipeline team or check the ADO board directly.
```

---

## Tone and Message Style Guidelines

| Guideline | Rule |
|-----------|------|
| **Brevity** | Notifications are 1–3 lines. No filler, no padding. |
| **Voice** | Active voice. Past tense for completed events. Present progressive for in-progress. |
| **No emoji in text** | Emoji are used only in Adaptive Card UI elements (as designed). Text messages contain no emoji. |
| **No filler phrases** | Never "Great news!", "Just so you know", "I'm happy to report". |
| **Always include WI ID** | Every message starts with "WI-{id} · " or contains the WI ID. |
| **Always include timestamp** | End every notification with the UTC timestamp. |
| **No AI self-reference** | The bot never says "I am an AI" or references Claude or Anthropic. |
| **Error messages are actionable** | Every error message tells the user what to do next. |
| **No pipeline jargon** | Use "feature request" not "work item" in user-facing text. Use agent names only when necessary. |

---

## Handling Unknown Messages

When the bot receives a message that does not match a known command and does not trigger
intake mode:

**First, the bot checks:**
1. Is there an active intake session for this user? → Resume intake at current step.
2. Is the message a reply in an existing WI thread? → Check for card interaction response.
3. Does the message contain a WI ID (e.g. "WI-542")? → Treat as a status query.

**If none of the above match:**

The bot responds:

```
I can help you start a new feature request or check the status of an existing one.

  · To create a new feature: describe what you want to build
  · To check status: type "status WI-{id}" or "status all"
  · For help: type "help"
```

The bot does NOT attempt to answer general questions, explain pipeline internals, or
engage in conversation outside the scope above.

---

## Security Rules

- The bot only acts on messages from authenticated Teams users in allowed tenants.
- ADO webhook events are validated by HMAC-SHA256 signature before processing.
- The bot never logs message body content beyond what is needed for pipeline routing.
- Response comments posted to ADO are attributed to the pipeline service account, not
  the user's ADO identity (to avoid requiring each Teams user to have an ADO account).
  The `responded_by` field in the `[TEAMS_INPUT_RESPONSE]` JSON contains the Teams
  display name for auditability.
- The bot does not store user message text in the state store; only form field values
  collected during guided intake are persisted (title, description, criteria, priority).

---

## Configuration

The following environment variables control bot behaviour:

```
TEAMS_BOT_APP_ID=<Azure Bot Service app ID>
TEAMS_BOT_APP_SECRET=<Azure Bot Service secret>
TEAMS_CHANNEL_ID=<default channel for pipeline notifications>
ADO_ORG_URL=https://dev.azure.com/<org>
ADO_PROJECT=<project name>
ADO_PAT=<service account PAT>
ADO_WEBHOOK_SECRET=<HMAC shared secret for ADO service hooks>
TEAMS_INPUT_TIMEOUT_HOURS=48
TEAMS_INPUT_REMINDER_HOURS=24
BOT_STATE_STORE_CONNECTION=<CosmosDB or Azure Table Storage connection string>
```

All secrets must be stored in Azure Key Vault and loaded at runtime. They must never be
hardcoded or committed to the repository.
