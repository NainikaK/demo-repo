# Low Level Design — Work Item 497

_Generated: 2026-05-04 14:47 UTC_

---

## Frontend Changes

**Components to create:** components/ChevronIcon.tsx

**Components to modify:** components/CompletedTasksSection.tsx

**Hooks:** none

**State changes:** Add isExpanded boolean state (default true) to CompletedTasksSection to track collapse/expand state of the completed tasks list

**Props interfaces:** ChevronIconProps

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

- `demo-app/frontend/src/components/ChevronIcon.tsx`

### Files to Modify

- `demo-app/frontend/src/components/CompletedTasksSection.tsx`
- `demo-app/frontend/src/utils/strings.ts`
- `demo-app/frontend/src/__tests__/CompletedTasksSection.test.tsx`

---

## New Dependencies

_(none)_
