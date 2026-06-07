import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
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
    title: 'Write unit tests',
    completed: true,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'high',
  },
  {
    id: '3',
    title: 'Buy birthday cake',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'medium',
  },
];

describe('useCompletedTasksSearch', () => {
  it('returns all tasks when the search term is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));

    expect(result.current.completedSearchTerm).toBe('');
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
    expect(result.current.filteredCompletedTasks).toEqual(MOCK_TASKS);
  });

  it('returns only tasks whose titles contain the search term (case-insensitive)', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('buy');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    expect(result.current.filteredCompletedTasks.map((t) => t.id)).toEqual(
      expect.arrayContaining(['1', '3'])
    );
    expect(
      result.current.filteredCompletedTasks.find((t) => t.id === '2')
    ).toBeUndefined();
  });

  it('restores the full list when the search term is cleared after filtering', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('unit');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(1);

    act(() => {
      result.current.setCompletedSearchTerm('');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(3);
    expect(result.current.filteredCompletedTasks).toEqual(MOCK_TASKS);
  });
});
