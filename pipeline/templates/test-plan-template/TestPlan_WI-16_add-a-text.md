# Test Plan Template — WI-16

_Generated: 2026-05-26 05:54 UTC_

## Acceptance Criteria Under Test

1. The text 'TESTING' is displayed in the header section of the 'Task Manager' page
2. The text 'TESTING' appears to the right of the 'Task Manager' page title
3. The font size of 'TESTING' matches the font size of the 'Task Manager' title text

## Frontend Files to Test

| File | Component | Test Type |
|---|---|---|
| `demo-app/frontend/src/components/Header.tsx` | | render / interaction / edge |
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
| `demo-app/frontend/src/components/Header.tsx` | 70% |
| `demo-app/frontend/src/utils/strings.ts` | 70% |

## Gherkin Scenarios

- As a user, I want to see a 'TESTING' label in the header next to the 'Task Manager' title, so that I am visually informed that the environment is a testing instance
