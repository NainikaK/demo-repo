# Audit Criteria Template — WI-474

_Generated: 2026-05-03 21:42 UTC_

## Acceptance Criteria

1. The completed tasks list container has a maximum height of 200px
2. When the completed tasks list content exceeds 200px in height, a vertical scrollbar appears allowing the user to scroll through the list
3. When the completed tasks list content is 200px or less in height, no scrollbar is shown
4. Content outside the 200px visible area is not visible until scrolled to

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

- `demo-app/frontend/src/components/CompletedTasksSection.tsx`

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
