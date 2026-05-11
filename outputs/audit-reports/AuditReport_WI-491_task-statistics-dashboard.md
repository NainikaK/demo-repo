# Audit Report — Work Item 491

_Generated: 2026-05-04 04:20 UTC_

---

## Result

| Composite Score | Recommendation |
|---|---|
| **7.7 / 10.0** | **HUMAN_REVIEW** |

---

## Category Scores

### Code Correctness — `1.4 / 2.0`

- **MEDIUM** (demo-app/frontend/src/pages/HomePage.tsx:68): In HomePage.tsx, `allStatTasks` is computed as `[...allTasks, ...completedTasks]`. If `allTasks` (from useUpcomingTasks) already includes completed tasks, or if `completedTasks` (from useCompletedTasks) overlaps with tasks in `allTasks`, tasks will be double-counted in the stats. The acceptance criterion states 'Stats reflect all tasks in the system with no filtering by user', meaning the stat source should be a single unified task list, not a union of two potentially overlapping arrays. This could cause inflated Total, Completed, and Pending counts.
- **LOW** (demo-app/frontend/src/hooks/useTaskStats.ts:18): The `isTaskOverdue` function compares `task.dueDate < today` using string comparison. This is only correct if `task.dueDate` is consistently formatted as 'YYYY-MM-DD'. If the Task type allows other date formats or ISO datetime strings with time components (e.g., '2024-01-15T00:00:00Z'), the string comparison may produce incorrect results. No validation or normalisation of `task.dueDate` format is performed.
- **LOW** (demo-app/frontend/src/hooks/useTasks.ts:44): The `completeTask` function in useTasks.ts performs an optimistic update (sets completed=true immediately) and rolls back on failure. However, there is no mechanism to mark a completed task as incomplete — the acceptance criterion 'After the user marks a completed task as incomplete, the Pending count increments by 1 and the Completed count decrements by 1' suggests toggle functionality is required. While this may be handled elsewhere, the useTasks hook only exposes a one-directional `completeTask`.

### Standards Compliance — `1.2 / 1.5`

- **MEDIUM** (demo-app/frontend/src/pages/HomePage.tsx:68): In HomePage.tsx, `allStatTasks` is computed inline during render (`const allStatTasks = [...allTasks, ...completedTasks]`) without `useMemo`. This creates a new array reference on every render, which will cause `useTaskStats` to re-run its `useMemo` on every render since the tasks reference always changes, defeating the memoisation. It should be wrapped in `useMemo`.
- **LOW** (demo-app/frontend/src/components/TaskStatsDashboard.tsx:14): The `StatTile` sub-component is defined inside the same file as `TaskStatsDashboard.tsx` rather than being exported or placed in its own file. While not strictly a violation, the LLD specifies only one component to create and the internal component pattern is acceptable; however the `StatTile` interface `StatTileProps` is defined locally and not exported, which is fine but worth noting for consistency.

### Test Coverage & Quality — `1.2 / 2.0`

- **HIGH**: The reported coverage_percent is 0.0, which is below the required 70% threshold. Even if this is a reporting artefact, the pipeline cannot confirm that line coverage meets the minimum standard for the changed files.
- **MEDIUM**: No test exists verifying that the `allStatTasks` union logic in HomePage.tsx correctly deduplicates or combines tasks. Given the potential double-counting bug, a test covering HomePage-level stat accuracy (e.g., that creating a task increments Total by exactly 1) is missing.
- **MEDIUM**: Three tests exist for TaskStatsDashboard (render, interaction, edge case) and three for useTaskStats — the minimum requirement is satisfied. However, there is no test covering the Gherkin-mapped scenario for 'After the user marks a completed task as incomplete, the Pending count increments by 1 and the Completed count decrements by 1', which is an explicit acceptance criterion.
- **LOW**: No test verifies that TaskStatsDashboard is rendered above the task list in HomePage — the acceptance criterion 'A row of four stat tiles is rendered at the top of the task list page, above the task list' has no corresponding integration or page-level test.

### Security — `2.0 / 2.0`

_(no findings)_

### Spec Adherence — `0.7 / 1.0`

- **MEDIUM** (demo-app/frontend/src/hooks/useTasks.ts:None): Acceptance criterion: 'After the user marks a completed task as incomplete, the Pending count increments by 1 and the Completed count decrements by 1'. No toggle-incomplete functionality is implemented or visible in the source files provided. The `completeTask` function only marks tasks complete, and there is no `uncompleteTask` or toggle function exposed.
- **LOW** (demo-app/frontend/src/components/TaskStatsDashboard.tsx:20): Acceptance criterion: 'The four tiles are displayed in a single horizontal row with no mobile-specific layout changes'. The dashboard uses `flex flex-row gap-4` which is correct. However, `flex-1` on each StatTile may cause layout issues on very small screens without explicit `min-w-0` or fixed widths, though no responsive breakpoint classes are used — this is a minor risk rather than a clear violation.
- **MEDIUM** (demo-app/frontend/src/pages/HomePage.tsx:68): Acceptance criterion: 'Stats reflect all tasks in the system with no filtering by user'. The implementation merges `allTasks` (upcoming, incomplete tasks) with `completedTasks` (completed tasks from a separate hook). If these sources are drawn from different API endpoints with different scopes or pagination, the stats may not accurately reflect all tasks in the system.

### Performance — `0.8 / 1.0`

- **LOW** (demo-app/frontend/src/pages/HomePage.tsx:68): `allStatTasks` in HomePage.tsx is computed as a new array every render without `useMemo`. This causes a new array reference to be passed to `TaskStatsDashboard` on every render, triggering a re-render of the dashboard and re-execution of the `useMemo` in `useTaskStats` even when neither `allTasks` nor `completedTasks` has changed.

### Documentation — `0.4 / 0.5`

- **LOW** (demo-app/frontend/src/hooks/useTaskStats.ts:23): The new `useTaskStats` hook and `TaskStatsDashboard` component lack JSDoc/TSDoc comments on their exported functions and interfaces. While not a blocker for a frontend-only change, XML/JSDoc comments on public exports would improve maintainability and are expected per standards.

---

## Blocking Findings

_(none)_

---

## Summary

The implementation delivers the core TaskStatsDashboard and useTaskStats hook correctly, with proper Tailwind colouring for overdue (red) and completed (green) tiles, correct overdue logic (no-due-date tasks excluded, completed tasks excluded), and all four stat labels extracted to the strings utility. All 100 tests pass. The most significant concern is a potential double-counting bug in HomePage.tsx where `allStatTasks` is formed by concatenating `allTasks` (upstream tasks) and `completedTasks` (from a separate hook), which could overlap and inflate counts — this should be replaced with a single unified task source. A related standards issue is that this concatenation is performed without `useMemo`, defeating the memoisation in `useTaskStats` and causing unnecessary re-renders. The toggle-incomplete acceptance criterion ('mark a completed task as incomplete') has no corresponding implementation in the provided source files, representing a spec gap. Coverage reporting shows 0.0%, which is below the 70% threshold and cannot be verified as compliant. Documentation for the new hook and component is minimal. Overall the feature is largely on-track but requires the task-source unification fix and verification of the incomplete-toggle flow before it can be considered fully complete.
