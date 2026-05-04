import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTaskSearch } from '../hooks/useTaskSearch';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
  { id: '1', title: 'Fix login bug', completed: false, createdAt: '2024-01-01T00:00:00.000Z', priority: 'high' },
  { id: '2', title: 'Write unit tests', completed: false, createdAt: '2024-01-02T00:00:00.000Z', priority: 'medium' },
  { id: '3', title: 'Update documentation', completed: false, createdAt: '2024-01-03T00:00:00.000Z', priority: 'low' },
];

describe('useTaskSearch', () => {
  it('success case - returns all tasks when searchTerm is empty', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useTaskSearch(tasks));

    expect(result.current.searchTerm).toBe('');
    expect(result.current.filteredTasks).toHaveLength(3);
    expect(result.current.filteredTasks).toEqual(tasks);
  });

  it('error case - returns only tasks whose titles contain the search term (case-insensitive)', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useTaskSearch(tasks));

    act(() => {
      result.current.setSearchTerm('unit');
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('2');
  });

  it('loading state - returns an empty array when no tasks match the search term', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useTaskSearch(tasks));

    act(() => {
      result.current.setSearchTerm('zzznomatch');
    });

    expect(result.current.filteredTasks).toHaveLength(0);
  });
});
