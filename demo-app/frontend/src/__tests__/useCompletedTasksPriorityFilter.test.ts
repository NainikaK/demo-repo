import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useCompletedTasksPriorityFilter } from '../hooks/useCompletedTasksPriorityFilter';
import type { Task } from '../types';

const STORAGE_KEY = 'completedTasksPriorityFilter';

const makeTasks = (): Task[] => [
  { id: '1', title: 'Low task', completed: true, createdAt: '2024-01-01T00:00:00.000Z', priority: 'low' },
  { id: '2', title: 'Medium task', completed: true, createdAt: '2024-01-02T00:00:00.000Z', priority: 'medium' },
  { id: '3', title: 'High task', completed: true, createdAt: '2024-01-03T00:00:00.000Z', priority: 'high' },
];

function makeLocalStorageMock(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  };
}

describe('useCompletedTasksPriorityFilter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('success case - returns all tasks as filteredTasks when selectedPriority is null', () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    const { result } = renderHook(() => useCompletedTasksPriorityFilter(makeTasks()));

    expect(result.current.selectedPriority).toBeNull();
    expect(result.current.filteredTasks).toHaveLength(3);
  });

  it('error case - returns only tasks matching selected priority when setSelectedPriority is called', () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    const { result } = renderHook(() => useCompletedTasksPriorityFilter(makeTasks()));

    act(() => {
      result.current.setSelectedPriority('high');
    });

    expect(result.current.selectedPriority).toBe('high');
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('3');
  });

  it('loading state - reads stored priority from localStorage on initialization and filters accordingly', () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock({ [STORAGE_KEY]: 'medium' }));
    const { result } = renderHook(() => useCompletedTasksPriorityFilter(makeTasks()));

    expect(result.current.selectedPriority).toBe('medium');
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('2');
  });
});
