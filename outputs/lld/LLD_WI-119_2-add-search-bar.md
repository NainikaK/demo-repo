# Low Level Design — Work Item 119

_Generated: 2026-06-14 18:56 UTC_

---

## Frontend Changes

**Components to create:** none

**Components to modify:** components/CompletedTasksSection.tsx

**Hooks:** useCompletedTaskSearch.ts

**State changes:** Add completedSearchTerm string state (initially empty) to CompletedTasksSection, managed via the new useCompletedTaskSearch hook, Derive filteredCompletedTasks inside CompletedTasksSection by applying case-insensitive title filter from useCompletedTaskSearch over the completedTasks prop, Show 'No completed tasks match your search' empty-state message when filteredCompletedTasks is empty and completedSearchTerm is non-empty

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

- `demo-app/frontend/src/hooks/useCompletedTaskSearch.ts`
- `demo-app/frontend/src/__tests__/useCompletedTaskSearch.test.ts`
- `demo-app/frontend/src/__tests__/CompletedTasksSection.searchbar.test.tsx`

### Files to Modify

- `demo-app/frontend/src/components/CompletedTasksSection.tsx`
- `demo-app/frontend/src/utils/strings.ts`

---

## New Dependencies

_(none)_
