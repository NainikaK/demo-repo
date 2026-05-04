import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTaskStats } from '../hooks/useTaskStats';
import type { Task } from '../types';

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    id: overrides.id,
    title: `Task ${overrides.id}`,
    completed: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'medium',
    ...overrides,
  };
}

// Returns a date string guaranteed to be in the past (yesterday)
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns a date string guaranteed to be in the future (tomorrow)
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('useTaskStats', () => {
  it('success case - returns correct total, completed, pending, and overdue counts for a mixed task list', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', completed: false, dueDate: yesterday() }), // overdue
      makeTask({ id: '2', completed: false, dueDate: tomorrow() }),  // pending, not overdue
      makeTask({ id: '3', completed: true }),                         // completed
      makeTask({ id: '4', completed: false }),                        // pending, no due date
    ];

    const { result } = renderHook(() => useTaskStats(tasks));

    expect(result.current.total).toBe(4);
    expect(result.current.completed).toBe(1);
    expect(result.current.pending).toBe(3);
    expect(result.current.overdue).toBe(1);
  });

  it('error case - a task with no due date is never counted as overdue', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', completed: false, dueDate: undefined }),
      makeTask({ id: '2', completed: false, dueDate: undefined }),
    ];

    const { result } = renderHook(() => useTaskStats(tasks));

    expect(result.current.overdue).toBe(0);
    expect(result.current.pending).toBe(2);
  });

  it('loading state - returns all zeros when the tasks array is empty', () => {
    const { result } = renderHook(() => useTaskStats([]));

    expect(result.current.total).toBe(0);
    expect(result.current.completed).toBe(0);
    expect(result.current.pending).toBe(0);
    expect(result.current.overdue).toBe(0);
  });
});
