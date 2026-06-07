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
  it('returns all tasks when search term is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });

  it('filters tasks by title substring (case-insensitive)', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('buy');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    expect(result.current.filteredCompletedTasks.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('is case-insensitive when filtering', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('WRITE');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].id).toBe('2');
  });

  it('returns empty array when no tasks match', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('zzznomatch');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });

  it('restores all tasks when search term is cleared', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('buy');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    act(() => {
      result.current.setCompletedSearchTerm('');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });

  it('trims whitespace before filtering', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('  buy  ');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(2);
  });

  it('exposes completedSearchTerm that matches the set value', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('tests');
    });
    expect(result.current.completedSearchTerm).toBe('tests');
  });
});
