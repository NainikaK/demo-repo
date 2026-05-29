# Phase 3 Build Guide: ADO Service Hooks

## Overview

This guide configures four Azure DevOps Service Hooks that fire HTTP webhooks to Power
Automate flows whenever pipeline-relevant events occur. This is the bridge between ADO
and Teams — every state change, comment, and PR raised by the pipeline agents is relayed
to the operator via the bot.

**Two flows receive these webhooks (built in the next guide):**

| Flow | Name | Receives |
|---|---|---|
| Flow A | `SDLC - ADO State Notifier` | Work item created, state changed, PR created |
| Flow B | `SDLC - ADO Comment Relay` | Comments added to work items |

**Placeholders used in this guide:**

| Placeholder | Replace With |
|---|---|
| `{ADO_ORG}` | Your Azure DevOps organization name |
| `{ADO_PROJECT}` | Your Azure DevOps project name |
| `{FLOW_A_URL}` | HTTP POST URL from `SDLC - ADO State Notifier` trigger |
| `{FLOW_B_URL}` | HTTP POST URL from `SDLC - ADO Comment Relay` trigger |

Get `{FLOW_A_URL}` and `{FLOW_B_URL}` from Power Automate after saving each flow
(see phase3-power-automate-notify-flows.md, Section 8 of each flow).

---

## Getting to Service Hooks in ADO

All 4 hooks are created from the same place:

1. Open Azure DevOps: `https://dev.azure.com/{ADO_ORG}/{ADO_PROJECT}`
2. Bottom left: click **Project settings** (gear icon)
3. Left sidebar (under General): click **Service hooks**
4. You see the list of existing subscriptions
5. To add each hook below: click **+ Create subscription**

---

## Event 1 — Work Item Created

**Purpose:** Notifies the operator the moment a new work item is picked up by the
pipeline. Sends: `"⚙️ Pipeline started for WI-{id}: {title}"`

### Step-by-Step

1. Click **+ Create subscription**
2. In the **Service** list, scroll to and select **Web Hooks**
3. Click **Next**

**Trigger settings:**
4. **Trigger on this type of event:** `Work item created`
5. **Filters — Area path:** leave blank (all areas) or select a specific area path
6. **Filters — Work item type:** `User Story` _(repeat for `Feature` if needed — or leave as `[Any]`)_
7. Click **Next**

**Action settings:**
8. **URL:** paste `{FLOW_A_URL}`
   _(This is the HTTP POST URL from the `SDLC - ADO State Notifier` flow trigger)_
9. **HTTP headers:** leave blank
10. **Resource details to send:** `All`
11. **Messages to send:** `All`
12. **Detailed messages to send:** `All`
13. Click **Test** (optional — see Testing section below)
14. Click **Finish**

**What the flow receives in the body:**

```json
{
  "eventType": "workitem.created",
  "resource": {
    "id": 42,
    "fields": {
      "System.Title": "Add dark mode toggle",
      "System.State": "New",
      "System.WorkItemType": "User Story"
    }
  }
}
```

**Teams message produced by Flow A:**
> ⚙️ Pipeline started for WI-42: Add dark mode toggle

---

## Event 2 — Work Item State Changed

**Purpose:** Notifies the operator when the pipeline agents move a work item through
ADO states. Different messages are sent depending on the new state.

### Step-by-Step

1. Click **+ Create subscription**
2. Service: **Web Hooks** → click **Next**

**Trigger settings:**
3. **Trigger on this type of event:** `Work item updated`
4. **Filters — Field:** `State`
   _(This ensures the hook only fires when the State field changes, not on any update)_
5. **Filters — Work item type:** `[Any]`
6. Click **Next**

**Action settings:**
7. **URL:** paste `{FLOW_A_URL}`
8. **Resource details to send:** `All`
9. **Messages to send:** `All`
10. **Detailed messages to send:** `All`
11. Click **Finish**

**What the flow receives:**

```json
{
  "eventType": "workitem.updated",
  "resource": {
    "id": 42,
    "fields": {
      "System.State": {
        "oldValue": "New",
        "newValue": "Active"
      },
      "System.Title": { "newValue": "Add dark mode toggle" }
    }
  }
}
```

**Teams messages produced by Flow A based on `newState`:**

| `newState` value | Teams message |
|---|---|
| `Active` | 🔄 WI-42 is now Active — agents are working |
| `Resolved` | ✅ WI-42 Resolved — pipeline complete |
| `Closed` | 🔒 WI-42 Closed |
| _(any other)_ | 🔔 WI-42 state changed to {newState} |

---

## Event 3 — Comment Added to Work Item

**Purpose:** Relays agent comments to Teams. If a comment contains the special prefix
`[TEAMS_INPUT_NEEDED]`, the human input flow is triggered. All other comments are
shown as a brief preview.

### Step-by-Step

1. Click **+ Create subscription**
2. Service: **Web Hooks** → click **Next**

**Trigger settings:**
3. **Trigger on this type of event:** `Work item commented on`
4. **Filters — Area path:** leave blank
5. **Filters — Work item type:** `[Any]`
6. Click **Next**

**Action settings:**
7. **URL:** paste `{FLOW_B_URL}`
   _(This is the HTTP POST URL from the `SDLC - ADO Comment Relay` flow trigger)_
8. **Resource details to send:** `All`
9. **Messages to send:** `All`
10. **Detailed messages to send:** `All`
11. Click **Finish**

**What Flow B receives:**

```json
{
  "eventType": "workitem.commented",
  "resource": {
    "id": 42,
    "comment": {
      "text": "[TEAMS_INPUT_NEEDED] {\"question\":\"...\",\"context\":\"...\",\"options\":[...],\"wi_id\":42,\"agent\":\"Clarification Agent\"}"
    },
    "fields": {
      "System.Title": { "newValue": "Add dark mode toggle" }
    }
  }
}
```

**Routing logic in Flow B:**
- Comment starts with `[TEAMS_INPUT_NEEDED]` → parse JSON payload → post Adaptive Card to `{TEAMS_USER_EMAIL}` requesting human input
- Any other comment → extract first 200 characters → post Teams message: `💬 WI-42: {comment preview}`

---

## Event 4 — Pull Request Created

**Purpose:** Notifies the operator when the Supervisor Agent opens a PR, with a direct
link to the PR.

### Step-by-Step

1. Click **+ Create subscription**
2. Service: **Web Hooks** → click **Next**

**Trigger settings:**
3. **Trigger on this type of event:** `Pull request created`
4. **Filters — Repository:** select your repository, or leave as `[Any]`
5. **Filters — Branch:** `main` (or your base branch)
6. **Filters — Created by:** leave blank
7. Click **Next**

**Action settings:**
8. **URL:** paste `{FLOW_A_URL}`
9. **Resource details to send:** `All`
10. **Messages to send:** `All`
11. **Detailed messages to send:** `All`
12. Click **Finish**

**What the flow receives:**

```json
{
  "eventType": "git.pullrequest.created",
  "resource": {
    "pullRequestId": 17,
    "title": "[42] Add dark mode toggle",
    "repository": { "name": "my-sdlc-repo" },
    "_links": {
      "web": { "href": "https://dev.azure.com/{ADO_ORG}/{ADO_PROJECT}/_git/my-sdlc-repo/pullrequest/17" }
    }
  }
}
```

**Teams message produced by Flow A:**
> 🔀 PR raised for WI-42: [42] Add dark mode toggle — https://dev.azure.com/{ADO_ORG}/{ADO_PROJECT}/_git/my-sdlc-repo/pullrequest/17

---

## Testing Service Hooks from ADO

ADO lets you send a test payload to verify the webhook is working before real events fire.

### Test from the Create Subscription Wizard

During hook creation (before clicking Finish):
1. After entering the URL in the Action settings step, click **Test**
2. ADO sends a synthetic payload to the URL
3. In Power Automate, open the flow's **Run history** — you should see a new triggered run
4. If the run succeeded, the test delivery worked
5. Click **Close** to return to the wizard, then **Finish**

### Test an Existing Hook

1. In **Service hooks**, find the subscription in the list
2. Click the **...** menu next to it
3. Click **Test**
4. ADO sends a test payload and shows the HTTP response code (expect `200`)

### Verify in Power Automate

1. Open `SDLC - ADO State Notifier` (or Flow B) in Power Automate
2. Click **Run history** (left sidebar or top bar)
3. Find the test run — click it to expand
4. Check that each action succeeded (green ticks)
5. Check Teams — the message should appear in your chat with the bot

---

## Summary: Hook Configuration Reference

| # | Event | Filter | Webhook Target | Teams Message |
|---|---|---|---|---|
| 1 | Work item created | Type: any | `{FLOW_A_URL}` | ⚙️ Pipeline started for WI-{id}: {title} |
| 2 | Work item updated | Field: State | `{FLOW_A_URL}` | State-specific emoji + message |
| 3 | Work item commented on | None | `{FLOW_B_URL}` | 💬 preview or human input card |
| 4 | Pull request created | Branch: main | `{FLOW_A_URL}` | 🔀 PR raised for WI-{id}: {title} — {url} |

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Test delivery returns 400/500 | Flow URL is wrong or flow is off | Check `{FLOW_A_URL}` / `{FLOW_B_URL}`. Ensure the flow is saved and turned on. |
| Teams message not appearing | Flow ran but Teams action failed | Open the run in Power Automate and check the "Post message" action for errors. Verify `{TEAMS_USER_EMAIL}`. |
| Hook fires on every update, not just state changes | Missing field filter on Event 2 | Edit the subscription → change Filters → Field to `State`. |
| Comment hook fires but no Adaptive Card appears | `[TEAMS_INPUT_NEEDED]` condition not matching | Check the comment text in the run history. Ensure the JSON prefix is `[TEAMS_INPUT_NEEDED] ` (with a space after). |
| PR hook fires but wrong work item ID in message | Flow parsing issue | Verify the PR title format in the flow parse step matches `[{wi_id}]` prefix. |

---

*Last updated: 2026-05-26*
