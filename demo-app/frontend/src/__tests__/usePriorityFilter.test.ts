import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePriorityFilter } from '../hooks/usePriorityFilter';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
  { id: '1', title: 'Low task', completed: false, createdAt: '2024-01-01T00:00:00.000Z', priority: 'low' },
  { id: '2', title: 'Medium task', completed: false, createdAt: '2024-01-02T00:00:00.000Z', priority: 'medium' },
  { id: '3', title: 'High task', completed: false, createdAt: '2024-01-03T00:00:00.000Z', priority: 'high' },
];

describe('usePriorityFilter', () => {
  it('success case - filterTasks returns all tasks when selectedPriority is null', () => {
    const { result } = renderHook(() => usePriorityFilter());
    const tasks = makeTasks();

    const filtered = result.current.filterTasks(tasks);

    expect(filtered).toHaveLength(3);
  });

  it('error case - filterTasks returns only matching tasks when a priority is selected', () => {
    const { result } = renderHook(() => usePriorityFilter());
    const tasks = makeTasks();

    act(() => {
      result.current.setSelectedPriority('high');
    });

    const filtered = result.current.filterTasks(tasks);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('3');
  });

  it('loading state - clearFilter resets selectedPriority to null and filterTasks returns all tasks', () => {
    const { result } = renderHook(() => usePriorityFilter());
    const tasks = makeTasks();

    act(() => {
      result.current.setSelectedPriority('low');
    });

    expect(result.current.selectedPriority).toBe('low');

    act(() => {
      result.current.clearFilter();
    });

    expect(result.current.selectedPriority).toBeNull();
    const filtered = result.current.filterTasks(tasks);
    expect(filtered).toHaveLength(3);
  });
});
