# Audit Criteria Template — WI-500

_Generated: 2026-05-04 17:02 UTC_

## Acceptance Criteria

1. A chevron icon is displayed to the right of the eye icon in the Upcoming tasks section header
2. The chevron icon matches the same size and colour as the 'Upcoming tasks' title text
3. On page load, the Upcoming tasks section is in the expanded state and the chevron points upward (or in the direction indicating expanded)
4. Clicking the chevron collapses the Upcoming tasks section body content
5. When the section is collapsed, the chevron points downward (or in the direction indicating collapsed)
6. Clicking the chevron again re-expands the Upcoming tasks section body content
7. The collapsed/expanded state does not persist across page navigations or browser sessions

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

- `demo-app/frontend/src/__tests__/UpcomingTasksSection.test.tsx`
- `demo-app/frontend/src/pages/HomePage.tsx`
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
