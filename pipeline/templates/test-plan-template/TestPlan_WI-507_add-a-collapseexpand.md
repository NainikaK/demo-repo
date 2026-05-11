# Test Plan Template — WI-507

_Generated: 2026-05-05 19:47 UTC_

## Acceptance Criteria Under Test

1. A chevron icon is displayed to the right of the 'Add tasks' section title
2. The chevron icon is the same size as the title text
3. The chevron icon colour matches the title text colour
4. When the page first loads, the 'Add tasks' section is in the expanded state and the chevron points in the expanded direction
5. Clicking the chevron icon collapses the 'Add tasks' section, hiding all child elements
6. When collapsed, the chevron icon rotates/changes to indicate the collapsed state
7. Clicking the chevron icon again expands the 'Add tasks' section, revealing all child elements
8. Clicking the title text does not toggle the section — only clicking the chevron icon triggers the collapse/expand
9. The collapse/expand state is not persisted when the user navigates away and returns to the page

## Frontend Files to Test

| File | Component | Test Type |
|---|---|---|
| `demo-app/frontend/src/components/AddTasksSection.tsx` | | render / interaction / edge |
| `demo-app/frontend/src/__tests__/AddTasksSection.test.tsx` | | render / interaction / edge |
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
| `demo-app/frontend/src/components/AddTasksSection.tsx` | 70% |
| `demo-app/frontend/src/__tests__/AddTasksSection.test.tsx` | 70% |
| `demo-app/frontend/src/pages/HomePage.tsx` | 70% |
| `demo-app/frontend/src/utils/strings.ts` | 70% |

## Gherkin Scenarios

- As a user, I want to collapse the 'Add tasks' section using a chevron icon, so that I can hide its contents and reduce visual clutter on the page
- As a user, I want the 'Add tasks' section to be expanded by default on page load, so that I can immediately see and interact with its contents
- As a user, I want the chevron icon to visually indicate the current state of the section, so that I know whether clicking it will expand or collapse the content
