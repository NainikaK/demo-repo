# Low Level Design — Work Item 449

_Generated: 2026-05-03 21:11 UTC_

---

## Frontend Changes

**Components to create:** none

**Components to modify:** components/ActivityFeed.tsx, components/CommentPanel.tsx

**Hooks:** useActivity.ts

**State changes:** CommentPanel already manages activeTab state initialised to TAB_COMMENTS — no change needed to initial value, ActivityFeed receives entries, fetchLoading, fetchError props — update empty state text from 'No activity recorded yet.' to 'No activity yet' to match acceptance criteria, CommentPanel fetches activity (calls fetchActivity) when Activity tab is clicked, not on mount — confirm this is the existing behaviour and ensure it re-fetches each time the tab is opened

**Props interfaces:** ActivityFeedProps

---

## Backend Changes

### Endpoints

- `GET /api/v1/tasks/{taskId}/activity`
  - Response: `{"type": "array", "items": {"id": "string (GUID)", "taskId": "string", "description": "string (e.g. 'Task created' | 'Task marked complete' | 'Comment added')", "createdAt": "string (ISO 8601 UTC, e.g. '2024-01-15T09:00:00.0000000Z')"}}`

**Services:** Services/IActivityService.cs, Services/ActivityService.cs, Services/ITaskService.cs, Services/TaskService.cs, Services/ICommentService.cs, Services/CommentService.cs

**Data models:** Models/ActivityEntry.cs

**DTO changes:** DTOs/ActivityEntryDto.cs

---

## Files

### Files to Create

_(none)_

### Files to Modify

- `demo-app/frontend/src/components/ActivityFeed.tsx`
- `demo-app/frontend/src/components/CommentPanel.tsx`
- `demo-app/frontend/src/utils/strings.ts`
- `demo-app/backend/src/Services/TaskService.cs`
- `demo-app/backend/src/Services/CommentService.cs`
- `demo-app/backend/src/Controllers/ActivityController.cs`
- `demo-app/backend/src/DTOs/ActivityEntryDto.cs`

---

## New Dependencies

_(none)_
