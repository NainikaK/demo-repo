import { renderHook, act } from '@testing-library/react';
import { useCompletedTaskSearch } from '../hooks/useCompletedTaskSearch';
import type { Task } from '../types';

const MOCK_TASKS: Task[] = [
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
    title: 'Buy a new laptop',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'high',
  },
];

describe('useCompletedTaskSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));

    expect(result.current.completedSearchTerm).toBe('');
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
    expect(result.current.filteredCompletedTasks).toEqual(MOCK_TASKS);
  });

  it('filters tasks case-insensitively when a search term is set', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('BUY');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    expect(result.current.filteredCompletedTasks.map((t) => t.title)).toEqual(
      expect.arrayContaining(['Buy groceries', 'Buy a new laptop'])
    );
  });

  it('returns an empty array when no tasks match the search term', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('zzznomatch');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });
});
