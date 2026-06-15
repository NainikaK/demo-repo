import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Team Meeting',
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Write Report',
    completed: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Fix Bug',
    completed: true,
    createdAt: '2024-01-03T00:00:00.000Z',
    priority: 'low',
  },
];

describe('useCompletedTasksSearch', () => {
  it('filters tasks by title in a case-insensitive manner when a search term is set', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('MEETING');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].title).toBe('Team Meeting');
  });

  it('returns an empty array when no tasks match the search term', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('xyz-no-match');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });

  it('returns all tasks when the search term is empty (initial state)', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));

    expect(result.current.completedSearchTerm).toBe('');
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
    expect(result.current.filteredCompletedTasks).toEqual(MOCK_TASKS);
  });
});
