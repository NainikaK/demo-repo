# Audit Criteria Template — WI-119

_Generated: 2026-06-14 18:58 UTC_

## Acceptance Criteria

1. A search bar is present in the Completed Tasks section
2. The search bar is visually identical in style to the search bar in the Upcoming Tasks section
3. As the user types in the search bar, the completed tasks list filters in real time to show only tasks whose title contains the entered text
4. Tasks whose titles do not match the search input are hidden from the Completed Tasks list while the search bar contains text
5. Clearing the search bar restores the full list of completed tasks

## Audit Category Checklist

| Category | Weight | Pass Threshold | Status |
|---|---|---|---|
| Code Correctness | 20% | ≥ 7/10 | [ ] |
| Standards Compliance | 15% | ≥ 7/10 | [ ] |
| Test Coverage | 20% | ≥ 7/10 | [ ] |
| Security | 20% | No HIGH/CRITICAL | [ ] |
| Spec Adherence | 10% | > 0/10 | [ ] |
| Performance | 10% | ≥ 5/10 | [ ] |
| Documentation | 5% | ≥ 5/10 | [ ] |

## Files Under Review

**Frontend:**

- `demo-app/frontend/src/hooks/useCompletedTaskSearch.ts`
- `demo-app/frontend/src/__tests__/useCompletedTaskSearch.test.ts`
- `demo-app/frontend/src/__tests__/CompletedTasksSection.searchbar.test.tsx`
- `demo-app/frontend/src/components/CompletedTasksSection.tsx`
- `demo-app/frontend/src/utils/strings.ts`

**Backend:**


## Blocking Conditions

- Any security finding severity HIGH or CRITICAL → **auto-reject**
- Any failing test → **auto-reject**
- Spec adherence score = 0 → **auto-reject**

## Merge Threshold

| Score | Outcome |
|---|---|
| ≥ 8.0 | Auto-merge |
| 7.0 – 7.99 | Draft PR, human review |
| < 7.0 | Pipeline failed |
