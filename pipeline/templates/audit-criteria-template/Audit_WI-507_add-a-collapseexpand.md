# Audit Criteria Template — WI-507

_Generated: 2026-05-05 19:47 UTC_

## Acceptance Criteria

1. A chevron icon is displayed to the right of the 'Add tasks' section title
2. The chevron icon is the same size as the title text
3. The chevron icon colour matches the title text colour
4. When the page first loads, the 'Add tasks' section is in the expanded state and the chevron points in the expanded direction
5. Clicking the chevron icon collapses the 'Add tasks' section, hiding all child elements
6. When collapsed, the chevron icon rotates/changes to indicate the collapsed state
7. Clicking the chevron icon again expands the 'Add tasks' section, revealing all child elements
8. Clicking the title text does not toggle the section — only clicking the chevron icon triggers the collapse/expand
9. The collapse/expand state is not persisted when the user navigates away and returns to the page

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

- `demo-app/frontend/src/components/AddTasksSection.tsx`
- `demo-app/frontend/src/__tests__/AddTasksSection.test.tsx`
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
