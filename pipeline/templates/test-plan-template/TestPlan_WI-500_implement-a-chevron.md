# Test Plan Template — WI-500

_Generated: 2026-05-04 17:01 UTC_

## Acceptance Criteria Under Test

1. A chevron icon is displayed to the right of the eye icon in the Upcoming tasks section header
2. The chevron icon matches the same size and colour as the 'Upcoming tasks' title text
3. On page load, the Upcoming tasks section is in the expanded state and the chevron points upward (or in the direction indicating expanded)
4. Clicking the chevron collapses the Upcoming tasks section body content
5. When the section is collapsed, the chevron points downward (or in the direction indicating collapsed)
6. Clicking the chevron again re-expands the Upcoming tasks section body content
7. The collapsed/expanded state does not persist across page navigations or browser sessions

## Frontend Files to Test

| File | Component | Test Type |
|---|---|---|
| `demo-app/frontend/src/__tests__/UpcomingTasksSection.test.tsx` | | render / interaction / edge |
| `demo-app/frontend/src/pages/HomePage.tsx` | | render / interaction / edge |
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
| `demo-app/frontend/src/__tests__/UpcomingTasksSection.test.tsx` | 70% |
| `demo-app/frontend/src/pages/HomePage.tsx` | 70% |
| `demo-app/frontend/src/utils/strings.ts` | 70% |

## Gherkin Scenarios

- As a user, I want to collapse the Upcoming tasks section using a chevron, so that I can hide the task list when I do not need to see it
- As a user, I want the Upcoming tasks section to be expanded by default on page load, so that I can immediately see my upcoming tasks without extra interaction
