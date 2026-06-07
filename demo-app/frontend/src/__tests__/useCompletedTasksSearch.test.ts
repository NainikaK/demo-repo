import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const makeTask = (id: string, title: string): Task => ({
  id,
  title,
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'low',
});

const TASKS: Task[] = [
  makeTask('1', 'Buy groceries'),
  makeTask('2', 'Fix bug in login'),
  makeTask('3', 'Write tests'),
];

describe('useCompletedTasksSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));

    expect(result.current.filteredCompletedTasks).toHaveLength(3);
    expect(result.current.completedSearchTerm).toBe('');
  });

  it('filters tasks by title when search term is set', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('bug');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].title).toBe('Fix bug in login');
  });

  it('returns empty array when no tasks match the search term', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));

    act(() => {
      result.current.setCompletedSearchTerm('zzznomatch');
    });

    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });
});
