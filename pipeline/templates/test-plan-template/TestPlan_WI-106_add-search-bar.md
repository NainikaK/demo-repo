# Test Plan Template — WI-106

_Generated: 2026-06-05 06:02 UTC_

## Acceptance Criteria Under Test

1. A search bar is visible in the Completed Tasks section
2. The search bar is visually identical in style to the search bar in the Upcoming Tasks section
3. As the user types in the search bar, the list of completed tasks is filtered in real time to show only tasks whose titles match the input
4. Tasks whose titles do not match the current search input are hidden from the Completed Tasks list
5. Clearing the search bar restores the full list of completed tasks

## Frontend Files to Test

| File | Component | Test Type |
|---|---|---|
| `demo-app/frontend/src/hooks/useCompletedTaskSearch.ts` | | render / interaction / edge |
| `demo-app/frontend/src/__tests__/useCompletedTaskSearch.test.ts` | | render / interaction / edge |
| `demo-app/frontend/src/__tests__/CompletedTasksSection.search.test.tsx` | | render / interaction / edge |
| `demo-app/frontend/src/components/CompletedTasksSection.tsx` | | render / interaction / edge |
| `demo-app/frontend/src/utils/strings.ts` | | render / interaction / edge |

## Component Test Requirements

| Component | Render | Interaction | Edge Case |
|---|---|---|---|

## Endpoint Test Requirements

| Endpoint | 2xx | 4xx | 5xx |
|---|---|---|---|

## Coverage Target

| File | Min Coverage |
|---|---|
| `demo-app/frontend/src/hooks/useCompletedTaskSearch.ts` | 70% |
| `demo-app/frontend/src/__tests__/useCompletedTaskSearch.test.ts` | 70% |
| `demo-app/frontend/src/__tests__/CompletedTasksSection.search.test.tsx` | 70% |
| `demo-app/frontend/src/components/CompletedTasksSection.tsx` | 70% |
| `demo-app/frontend/src/utils/strings.ts` | 70% |

## Gherkin Scenarios

- As a user, I want a search bar in the Completed Tasks section, so that I can quickly find a specific completed task by its title
- As a user, I want the completed tasks list to filter in real time as I type, so that I can see matching results without submitting a search form
