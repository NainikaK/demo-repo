# Webhook Payload Contracts

## Overview

This document defines the exact JSON payload structure the Teams bot receives from each
ADO service hook event. All payloads arrive as HTTP POST to the bot's webhook endpoint.
The bot validates the HMAC-SHA256 signature on every request before processing.

Field names use ADO's native naming conventions. The bot extracts specific fields listed
under each event; all other fields may be ignored.

---

## Event 1 — `workitem.created`

Fired when a new work item is created in ADO.

```json
{
  "subscriptionId": "<guid>",
  "notificationId": 1,
  "id": "<event-guid>",
  "eventType": "workitem.created",
  "publisherId": "tfs",
  "message": {
    "text": "Work item 542 created by Jane Smith"
  },
  "resource": {
    "id": 542,
    "rev": 1,
    "fields": {
      "System.Id": 542,
      "System.Title": "Dark/Light Mode Toggle",
      "System.WorkItemType": "Feature",
      "System.State": "New",
      "System.Tags": "ai-pipeline-trigger",
      "System.CreatedBy": {
        "displayName": "Jane Smith",
        "uniqueName": "jane.smith@example.com"
      },
      "Microsoft.VSTS.Common.Priority": 1,
      "System.Description": "<p>Users should be able to switch between dark and light themes...</p>"
    },
    "_links": {
      "html": {
        "href": "https://dev.azure.com/{org}/{project}/_workitems/edit/542"
      }
    },
    "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workItems/542"
  },
  "resourceVersion": "1.0",
  "createdDate": "2026-05-20T14:00:00Z"
}
```

**Fields the bot reads:**

| Field path | Bot usage |
|-----------|----------|
| `resource.id` | Work item ID (WI-542) |
| `resource.fields.System.Title` | Thread header and notification text |
| `resource.fields.System.WorkItemType` | Included in notification |
| `resource.fields.System.State` | Sanity check (must be New) |
| `resource.fields.System.Tags` | Confirm `ai-pipeline-trigger` is present |
| `resource.fields.System.CreatedBy.displayName` | Attributed to this user's Teams thread |
| `resource.fields.Microsoft.VSTS.Common.Priority` | Included in notification |
| `resource._links.html.href` | "View in ADO" link in card |

---

## Event 2 — `workitem.updated` (State Change)

Fired whenever a work item field is updated. The bot filters for changes to
`System.State` by checking whether `resource.fields.System.State` is present in the
`changedFields` subset.

```json
{
  "subscriptionId": "<guid>",
  "notificationId": 2,
  "id": "<event-guid>",
  "eventType": "workitem.updated",
  "publisherId": "tfs",
  "message": {
    "text": "Work item 542 updated by Pipeline Service"
  },
  "resource": {
    "id": 542,
    "rev": 3,
    "revisedBy": {
      "displayName": "Pipeline Service",
      "uniqueName": "pipeline-service@example.com"
    },
    "fields": {
      "System.Id": {
        "oldValue": 542,
        "newValue": 542
      },
      "System.State": {
        "oldValue": "New",
        "newValue": "Active"
      }
    },
    "revision": {
      "id": 542,
      "fields": {
        "System.Title": "Dark/Light Mode Toggle",
        "System.Tags": "ai-pipeline-trigger",
        "System.State": "Active"
      },
      "_links": {
        "html": {
          "href": "https://dev.azure.com/{org}/{project}/_workitems/edit/542"
        }
      }
    },
    "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workItems/542"
  },
  "resourceVersion": "1.0",
  "createdDate": "2026-05-20T14:01:00Z"
}
```

**Fields the bot reads:**

| Field path | Bot usage |
|-----------|----------|
| `resource.id` | Look up WI thread |
| `resource.fields.System.State.newValue` | Determine notification type |
| `resource.fields.System.State.oldValue` | Detect transitions; avoid duplicate notifications |
| `resource.fields.System.Tags.newValue` | Detect pipeline signal tags (see Event 3) |
| `resource.revision.fields.System.Title` | Included in notification text |
| `resource.revision._links.html.href` | "View in ADO" link |

**Tag change detection:** If `System.Tags` appears in `resource.fields`, the bot
compares `oldValue` and `newValue` to determine which tags were added and which removed.

---

## Event 3 — `workitem.commented`

Fired when a new comment is added to a work item.

```json
{
  "subscriptionId": "<guid>",
  "notificationId": 3,
  "id": "<event-guid>",
  "eventType": "workitem.commented",
  "publisherId": "tfs",
  "message": {
    "text": "Jane Smith commented on work item 542"
  },
  "resource": {
    "id": 542,
    "commentId": 1001,
    "text": "[TEAMS_INPUT_NEEDED]: {\n  \"question\": \"Where should the toggle be placed?\",\n  \"context\": \"The requirement does not specify placement.\",\n  \"options\": [\"Top-right navbar\", \"Settings page\"],\n  \"wi_id\": \"WI-542\",\n  \"agent\": \"clarification_agent\"\n}",
    "createdBy": {
      "displayName": "Pipeline Service",
      "uniqueName": "pipeline-service@example.com",
      "isServiceAccount": true
    },
    "createdDate": "2026-05-20T14:05:00Z",
    "workItem": {
      "id": 542,
      "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workItems/542",
      "_links": {
        "html": {
          "href": "https://dev.azure.com/{org}/{project}/_workitems/edit/542"
        }
      }
    }
  },
  "resourceVersion": "1.0",
  "createdDate": "2026-05-20T14:05:00Z"
}
```

**Fields the bot reads:**

| Field path | Bot usage |
|-----------|----------|
| `resource.id` | Look up WI thread |
| `resource.commentId` | Deduplication key |
| `resource.text` | Full comment body — checked for `[TEAMS_INPUT_NEEDED]:` prefix and pipeline agent patterns |
| `resource.createdBy.isServiceAccount` | Only process service account comments for `[TEAMS_INPUT_NEEDED]` |
| `resource.createdBy.displayName` | Attribution in log |
| `resource.createdDate` | Deduplication timestamp |
| `resource.workItem._links.html.href` | "View in ADO" link in cards |

---

## Event 4 — `git.pullrequest.created`

Fired when a pull request is opened on any branch in the configured repository.

```json
{
  "subscriptionId": "<guid>",
  "notificationId": 4,
  "id": "<event-guid>",
  "eventType": "git.pullrequest.created",
  "publisherId": "tfs",
  "resource": {
    "pullRequestId": 89,
    "title": "[WI-542] Dark/Light Mode Toggle",
    "description": "## Summary\n...",
    "status": "active",
    "isDraft": false,
    "createdBy": {
      "displayName": "Pipeline Service",
      "uniqueName": "pipeline-service@example.com"
    },
    "sourceRefName": "refs/heads/feature/542-dark-light-mode-toggle",
    "targetRefName": "refs/heads/main",
    "url": "https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repo}/pullRequests/89",
    "repository": {
      "name": "{repo}",
      "url": "https://dev.azure.com/{org}/{project}/_apis/git/repositories/{repo-id}"
    },
    "_links": {
      "web": {
        "href": "https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/89"
      }
    },
    "labels": [
      { "name": "ai-generated" },
      { "name": "pipeline-approved" }
    ]
  },
  "resourceVersion": "1.0",
  "createdDate": "2026-05-20T14:45:00Z"
}
```

**Fields the bot reads:**

| Field path | Bot usage |
|-----------|----------|
| `resource.pullRequestId` | PR number for notifications and cards |
| `resource.title` | Extract WI ID from title prefix `[WI-{id}]` |
| `resource.sourceRefName` | Extract WI ID from branch name `feature/{id}-{slug}` (fallback) |
| `resource.isDraft` | Determines card type: Approval card (draft) vs informational (non-draft) |
| `resource.status` | Must be `active`; ignore abandoned PRs |
| `resource._links.web.href` | "View PR" link in cards |

**WI ID extraction:** The bot parses the PR title for the pattern `[WI-(\d+)]`.
If not found, falls back to parsing `sourceRefName` for `feature/(\d+)-`.

---

## Event 5 — `git.pullrequest.merged`

Fired when a pull request is completed (merged) in ADO Git.

```json
{
  "subscriptionId": "<guid>",
  "notificationId": 5,
  "id": "<event-guid>",
  "eventType": "git.pullrequest.merged",
  "publisherId": "tfs",
  "resource": {
    "pullRequestId": 89,
    "title": "[WI-542] Dark/Light Mode Toggle",
    "status": "completed",
    "isDraft": false,
    "completionQueueTime": "2026-05-20T14:50:00Z",
    "closedDate": "2026-05-20T14:50:05Z",
    "mergeStatus": "succeeded",
    "sourceRefName": "refs/heads/feature/542-dark-light-mode-toggle",
    "targetRefName": "refs/heads/main",
    "lastMergeCommit": {
      "commitId": "a1b2c3d4e5f6..."
    },
    "_links": {
      "web": {
        "href": "https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/89"
      }
    }
  },
  "resourceVersion": "1.0",
  "createdDate": "2026-05-20T14:50:05Z"
}
```

**Fields the bot reads:**

| Field path | Bot usage |
|-----------|----------|
| `resource.pullRequestId` | PR number for Run Summary card |
| `resource.title` | WI ID extraction |
| `resource.sourceRefName` | WI ID extraction (fallback) |
| `resource.mergeStatus` | Must be `succeeded`; ignore failed merges |
| `resource.closedDate` | Timestamp in Run Summary card |
| `resource._links.web.href` | "View merged PR" link |

---

## Event 6 — `git.pullrequest.updated`

Fired when a pull request is updated (e.g. draft status changes, reviewers added).

```json
{
  "subscriptionId": "<guid>",
  "notificationId": 6,
  "id": "<event-guid>",
  "eventType": "git.pullrequest.updated",
  "publisherId": "tfs",
  "resource": {
    "pullRequestId": 89,
    "title": "[WI-542] Dark/Light Mode Toggle",
    "status": "active",
    "isDraft": false,
    "sourceRefName": "refs/heads/feature/542-dark-light-mode-toggle",
    "_links": {
      "web": {
        "href": "https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/89"
      }
    }
  },
  "resourceVersion": "1.0",
  "createdDate": "2026-05-20T15:00:00Z"
}
```

**Fields the bot reads:**

| Field path | Bot usage |
|-----------|----------|
| `resource.pullRequestId` | PR number |
| `resource.title` | WI ID extraction |
| `resource.isDraft` | If `false` and was previously `true`: draft promoted — post informational message |
| `resource._links.web.href` | "View PR" link |

The bot only posts a notification for this event when `isDraft` transitions from `true`
to `false`. All other PR update events (reviewer changes, description edits) are silently
logged.

---

## Webhook Authentication

All inbound webhooks must include a `X-Hub-Signature-256` header containing the
HMAC-SHA256 signature of the raw request body, computed using the shared secret
configured at subscription registration time.

The bot verifies this signature before processing any payload. Requests without a
valid signature return HTTP 401 and are logged for security audit.

---

## Error Responses

| Condition | HTTP Response | Bot Action |
|-----------|-------------|-----------|
| Valid payload, processed | 200 OK | Normal processing |
| Invalid HMAC signature | 401 Unauthorized | Log and reject; no Teams notification |
| Malformed JSON | 400 Bad Request | Log error; post "Webhook parse error" to ops channel |
| Unknown event type | 200 OK | Log and ignore; no Teams notification |
| WI thread not found | 200 OK | Create new thread, continue processing |
| Duplicate event (seen within 7 days) | 200 OK | Log deduplication hit; no action |
