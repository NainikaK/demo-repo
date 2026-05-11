# Low Level Design — Work Item 486

_Generated: 2026-05-04 03:52 UTC_

---

## Frontend Changes

**Components to create:** components/TaskSearchBar.tsx

**Components to modify:** pages/HomePage.tsx

**Hooks:** useTaskSearch.ts

**State changes:** Add searchTerm state (string, initialised to empty string) to HomePage for the upcoming tasks section only, On every keystroke in the search bar, update searchTerm and derive filteredUpcomingTasks by case-insensitive substring match on task.title, searchTerm is local component state (useState) — never persisted to localStorage, sessionStorage, or URL params — so it resets automatically on page navigation

**Props interfaces:** TaskSearchBarProps

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

- `demo-app/frontend/src/components/TaskSearchBar.tsx`
- `demo-app/frontend/src/hooks/useTaskSearch.ts`
- `demo-app/frontend/src/__tests__/TaskSearchBar.test.tsx`
- `demo-app/frontend/src/__tests__/useTaskSearch.test.ts`

### Files to Modify

- `demo-app/frontend/src/pages/HomePage.tsx`
- `demo-app/frontend/src/utils/strings.ts`

---

## New Dependencies

_(none)_
