# Low Level Design — Work Item 481

_Generated: 2026-05-04 03:33 UTC_

---

## Frontend Changes

**Components to create:** none

**Components to modify:** components/CompletedTasksSection.tsx

**Hooks:** useCompletedTasksPriorityFilter.ts

**State changes:** Add selectedPriority state (Priority | null) to a new useCompletedTasksPriorityFilter hook, initialised from localStorage using key 'completedTasksPriorityFilter', with validation against known priority values ('low', 'medium', 'high') to gracefully handle corrupted/unrecognised stored values by defaulting to null, Persist selectedPriority to localStorage under key 'completedTasksPriorityFilter' whenever it changes, Expose setSelectedPriority and filteredTasks (derived from input tasks filtered by selectedPriority) from the hook, Pass selectedPriority and onPriorityChange as new props into CompletedTasksSection, which internally renders PriorityFilter below the section heading and shows the empty-state message 'No tasks in this priority yet' when filteredTasks is empty but a priority is selected

**Props interfaces:** CompletedTasksSectionProps

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

- `demo-app/frontend/src/hooks/useCompletedTasksPriorityFilter.ts`

### Files to Modify

- `demo-app/frontend/src/components/CompletedTasksSection.tsx`
- `demo-app/frontend/src/pages/HomePage.tsx`
- `demo-app/frontend/src/utils/strings.ts`
- `demo-app/frontend/src/__tests__/CompletedTasksSection.test.tsx`

---

## New Dependencies

_(none)_
