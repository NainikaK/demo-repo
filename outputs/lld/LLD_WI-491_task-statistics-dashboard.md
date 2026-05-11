# Low Level Design — Work Item 491

_Generated: 2026-05-04 04:17 UTC_

---

## Frontend Changes

**Components to create:** components/TaskStatsDashboard.tsx

**Components to modify:** pages/HomePage.tsx

**Hooks:** useTaskStats.ts

**State changes:** Add useTaskStats hook that derives total, completed, pending, and overdue counts from a Task array passed as argument, A task is overdue if it has a dueDate, dueDate < today (string comparison yyyy-MM-dd), and completed is false, A task with no dueDate is never overdue, Stats are derived purely from the tasks array already managed by useTasks/useUpcomingTasks in HomePage — no additional fetch required, HomePage passes its full tasks array (from useTasks via useUpcomingTasks) to TaskStatsDashboard on every render so stats update after create, complete, and delete actions

**Props interfaces:** TaskStatsDashboardProps, StatTileProps

---

## Backend Changes

### Endpoints

_(none)_

**Services:** none

**Data models:** none

**DTO changes:** none

---

## Files

### Files to Create

- `demo-app/frontend/src/components/TaskStatsDashboard.tsx`
- `demo-app/frontend/src/hooks/useTaskStats.ts`

### Files to Modify

- `demo-app/frontend/src/pages/HomePage.tsx`
- `demo-app/frontend/src/utils/strings.ts`
- `demo-app/frontend/src/hooks/useTasks.ts`

---

## New Dependencies

_(none)_
