import { renderHook, act } from '@testing-library/react';
import { useCompletedTaskSearch } from '../hooks/useCompletedTaskSearch';
import type { Task } from '../types';

function makeTasks(): Task[] {
  return [
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
      title: 'Go for a run',
      completed: true,
      createdAt: '2024-01-03T00:00:00Z',
      priority: 'high',
    },
  ];
}

describe('useCompletedTaskSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));

    expect(result.current.filteredCompletedTasks).toHaveLength(3);
    expect(result.current.completedSearchTerm).toBe('');
  });

  it('filters tasks by title substring in a case-insensitive manner', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));

    act(() => {
      result.current.setCompletedSearchTerm('BOOK');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].title).toBe('Read a book');
  });

  it('returns an empty array when no tasks match the search term', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));

    act(() => {
      result.current.setCompletedSearchTerm('xyz_no_match');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });
});
