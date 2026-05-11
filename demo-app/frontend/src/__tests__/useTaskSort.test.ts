import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTaskSort } from '../hooks/useTaskSort';
import type { Task } from '../types';

function makeTask(id: string, dueDate?: string): Task {
  return {
    id,
    title: `Task ${id}`,
    completed: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'medium',
    dueDate,
  };
}

describe('useTaskSort', () => {
  it('success case - returns tasks sorted ascending by due date by default', () => {
    const tasks = [
      makeTask('1', '2024-03-10'),
      makeTask('2', '2024-01-05'),
      makeTask('3', '2024-06-20'),
    ];

    const { result } = renderHook(() => useTaskSort(tasks));

    expect(result.current.sortDirection).toBe('asc');
    expect(result.current.sortedTasks[0].id).toBe('2');
    expect(result.current.sortedTasks[1].id).toBe('1');
    expect(result.current.sortedTasks[2].id).toBe('3');
  });

  it('error case - tasks with no due date always appear at the bottom regardless of sort direction', () => {
    const tasks = [
      makeTask('1', '2024-03-10'),
      makeTask('2', undefined),
      makeTask('3', '2024-01-05'),
    ];

    const { result } = renderHook(() => useTaskSort(tasks));

    // ascending: dated tasks first, undated last
    expect(result.current.sortedTasks[2].id).toBe('2');

    act(() => {
      result.current.toggleSortDirection();
    });

    // descending: dated tasks first (reversed), undated still last
    expect(result.current.sortedTasks[2].id).toBe('2');
  });

  it('loading state - toggleSortDirection switches from asc to desc and back', () => {
    const tasks = [
      makeTask('1', '2024-03-10'),
      makeTask('2', '2024-01-05'),
    ];

    const { result } = renderHook(() => useTaskSort(tasks));

    expect(result.current.sortDirection).toBe('asc');

    act(() => {
      result.current.toggleSortDirection();
    });

    expect(result.current.sortDirection).toBe('desc');
    // descending: later date first
    expect(result.current.sortedTasks[0].id).toBe('1');
    expect(result.current.sortedTasks[1].id).toBe('2');

    act(() => {
      result.current.toggleSortDirection();
    });

    expect(result.current.sortDirection).toBe('asc');
  });
});
