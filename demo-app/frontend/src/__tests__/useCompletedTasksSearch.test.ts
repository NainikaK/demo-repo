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
  });

  it('filters tasks by title substring match', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('bug');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('1');
  });

  it('filters case-insensitively', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('WRITE');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('2');
  });

  it('returns empty array when no tasks match', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('nonexistent');
    });
    expect(result.current.filteredTasks).toHaveLength(0);
  });

  it('restores all tasks when search term is cleared', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('bug');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    act(() => {
      result.current.setSearchTerm('');
    });
    expect(result.current.filteredTasks).toHaveLength(3);
  });

  it('returns all tasks when search term is only whitespace', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('   ');
    });
    expect(result.current.filteredTasks).toHaveLength(3);
  });

  it('initialises with empty searchTerm', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    expect(result.current.searchTerm).toBe('');
  });

  it('updates searchTerm state via setSearchTerm', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('deploy');
    });
    expect(result.current.searchTerm).toBe('deploy');
  });
});
