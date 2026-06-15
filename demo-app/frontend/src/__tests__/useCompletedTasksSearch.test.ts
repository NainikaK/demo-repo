import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Fix the bug',
    completed: true,
    createdAt: '2024-01-01T00:00:00Z',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Write unit tests',
    completed: true,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Deploy to production',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'low',
  },
];

describe('useCompletedTasksSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    expect(result.current.filteredTasks).toHaveLength(3);
    expect(result.current.searchTerm).toBe('');
  });

  it('filters tasks by title in a case-insensitive manner', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('WRITE');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].title).toBe('Write unit tests');
  });

  it('returns an empty array when no tasks match the search term', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('zzznomatch');
    });
    expect(result.current.filteredTasks).toHaveLength(0);
  });
});
