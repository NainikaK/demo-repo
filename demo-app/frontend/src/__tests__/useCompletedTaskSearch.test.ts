import { renderHook, act } from '@testing-library/react';
import { useCompletedTaskSearch } from '../hooks/useCompletedTaskSearch';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
  {
    id: '1',
    title: 'Buy groceries',
    completed: true,
    createdAt: '2024-01-01T00:00:00Z',
    priority: 'low',
  },
  {
    id: '2',
    title: 'Read a book',
    completed: true,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Buy flowers',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'high',
  },
];

describe('useCompletedTaskSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));

    expect(result.current.filteredCompletedTasks).toHaveLength(3);
    expect(result.current.completedSearchTerm).toBe('');
  });

  it('filters tasks by title in a case-insensitive manner when a search term is set', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));

    act(() => {
      result.current.setCompletedSearchTerm('BUY');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    expect(result.current.filteredCompletedTasks.map((t) => t.title)).toContain('Buy groceries');
    expect(result.current.filteredCompletedTasks.map((t) => t.title)).toContain('Buy flowers');
  });

  it('returns all tasks when search term is cleared after being set', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));

    act(() => {
      result.current.setCompletedSearchTerm('read');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(1);

    act(() => {
      result.current.setCompletedSearchTerm('');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });
});
