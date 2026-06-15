import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
  { id: '1', title: 'Buy groceries', completed: true, createdAt: '2024-01-01', priority: 'low' },
  { id: '2', title: 'Task alpha', completed: true, createdAt: '2024-01-02', priority: 'medium' },
  { id: '3', title: 'TASK BETA', completed: true, createdAt: '2024-01-03', priority: 'high' },
];

describe('useCompletedTasksSearch', () => {
  it('filterBySearchTerm returns matching tasks case-insensitively when a search term is set', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());

    act(() => {
      result.current.setCompletedSearchTerm('task');
    });

    const filtered = result.current.filterBySearchTerm(makeTasks());
    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => t.title)).toContain('Task alpha');
    expect(filtered.map((t) => t.title)).toContain('TASK BETA');
  });

  it('filterBySearchTerm returns empty array without crashing when tasks list is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());

    act(() => {
      result.current.setCompletedSearchTerm('task');
    });

    const filtered = result.current.filterBySearchTerm([]);
    expect(filtered).toHaveLength(0);
  });

  it('filterBySearchTerm returns all tasks when completedSearchTerm is empty string', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());

    // completedSearchTerm is '' by default — no act needed
    const tasks = makeTasks();
    const filtered = result.current.filterBySearchTerm(tasks);
    expect(filtered).toHaveLength(tasks.length);
  });
});
