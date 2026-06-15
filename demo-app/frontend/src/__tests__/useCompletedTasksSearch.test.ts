import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

function makeTasks(): Task[] {
  return [
    {
      id: '1',
      title: 'Team Meeting',
      completed: true,
      createdAt: '2024-01-01T00:00:00Z',
      priority: 'high',
    },
    {
      id: '2',
      title: 'Write report',
      completed: true,
      createdAt: '2024-01-02T00:00:00Z',
      priority: 'medium',
    },
    {
      id: '3',
      title: 'Deploy service',
      completed: true,
      createdAt: '2024-01-03T00:00:00Z',
      priority: 'low',
    },
  ];
}

describe('useCompletedTasksSearch', () => {
  it('returns all tasks when searchTerm is empty', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, null),
    );
    expect(result.current.filteredTasks).toHaveLength(3);
    expect(result.current.searchTerm).toBe('');
  });

  it('filters tasks case-insensitively by title when searchTerm is set', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, null),
    );
    act(() => {
      result.current.setSearchTerm('meeting');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].title).toBe('Team Meeting');
  });

  it('returns empty array and does not crash when no tasks match the search term', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, null),
    );
    act(() => {
      result.current.setSearchTerm('zzznomatch');
    });
    expect(result.current.filteredTasks).toHaveLength(0);
  });

  it('applies priority filter before search filter', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, 'high'),
    );
    act(() => {
      result.current.setSearchTerm('meeting');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('1');
  });

  it('restores all tasks (within priority) when searchTerm is cleared', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, null),
    );
    act(() => {
      result.current.setSearchTerm('report');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    act(() => {
      result.current.setSearchTerm('');
    });
    expect(result.current.filteredTasks).toHaveLength(3);
  });

  it('defaults selectedPriority to null when not provided', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks),
    );
    expect(result.current.filteredTasks).toHaveLength(3);
  });
});
