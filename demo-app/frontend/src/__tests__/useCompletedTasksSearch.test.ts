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
  it('returns all tasks when search term is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });

  it('filters tasks by title case-insensitively', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('meeting');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].title).toBe('Team Meeting');
  });

  it('filters tasks with mixed case search term', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('REPORT');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].title).toBe('Write Report');
  });

  it('returns empty array when no tasks match the search term', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('xyz-no-match');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });

  it('restores full list when search term is cleared', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('meeting');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    act(() => {
      result.current.setCompletedSearchTerm('');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });

  it('initialises completedSearchTerm as empty string', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    expect(result.current.completedSearchTerm).toBe('');
  });

  it('returns all tasks when search term is whitespace only', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('   ');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });
});
