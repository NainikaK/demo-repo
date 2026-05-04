import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useCompletedTasksPriorityFilter } from '../hooks/useCompletedTasksPriorityFilter';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
  { id: '1', title: 'Low task', completed: true, createdAt: '2024-01-01T00:00:00.000Z', priority: 'low' },
  { id: '2', title: 'Medium task', completed: true, createdAt: '2024-01-02T00:00:00.000Z', priority: 'medium' },
  { id: '3', title: 'High task', completed: true, createdAt: '2024-01-03T00:00:00.000Z', priority: 'high' },
];

describe('useCompletedTasksPriorityFilter', () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success case - returns all tasks as filteredTasks when selectedPriority is null', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTasksPriorityFilter(tasks));

    expect(result.current.selectedPriority).toBeNull();
    expect(result.current.filteredTasks).toHaveLength(3);
  });

  it('error case - returns only tasks matching selected priority when setSelectedPriority is called', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTasksPriorityFilter(tasks));

    act(() => {
      result.current.setSelectedPriority('high');
    });

    expect(result.current.selectedPriority).toBe('high');
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('3');
  });

  it('loading state - reads stored priority from localStorage on initialization and filters accordingly', () => {
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('medium');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTasksPriorityFilter(tasks));

    expect(result.current.selectedPriority).toBe('medium');
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('2');
  });
});
