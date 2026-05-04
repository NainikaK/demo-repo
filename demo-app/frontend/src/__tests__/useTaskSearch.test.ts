import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTaskSearch } from '../hooks/useTaskSearch';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
  { id: '1', title: 'Buy groceries', completed: false, createdAt: '2024-01-01T00:00:00.000Z', priority: 'low' },
  { id: '2', title: 'Write unit tests', completed: false, createdAt: '2024-01-02T00:00:00.000Z', priority: 'high' },
  { id: '3', title: 'Review pull request', completed: false, createdAt: '2024-01-03T00:00:00.000Z', priority: 'medium' },
];

describe('useTaskSearch', () => {
  it('success case - returns all tasks when searchTerm is empty', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useTaskSearch(tasks));

    expect(result.current.filteredTasks).toHaveLength(3);
    expect(result.current.searchTerm).toBe('');
  });

  it('error case - returns empty array when no tasks match the search term', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useTaskSearch(tasks));

    act(() => {
      result.current.setSearchTerm('xyznotmatching');
    });

    expect(result.current.filteredTasks).toHaveLength(0);
  });

  it('loading state - filters tasks case-insensitively on every searchTerm change', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useTaskSearch(tasks));

    act(() => {
      result.current.setSearchTerm('UNIT');
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('2');

    act(() => {
      result.current.setSearchTerm('r');
    });

    expect(result.current.filteredTasks).toHaveLength(2);
  });
});
