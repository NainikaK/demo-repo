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
    expect(result.current.filteredCompletedTasks).toEqual(MOCK_TASKS);
  });

  it('filters tasks by title substring (case-insensitive)', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('buy');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    expect(result.current.filteredCompletedTasks[0].id).toBe('1');
    expect(result.current.filteredCompletedTasks[1].id).toBe('3');
  });

  it('is case-insensitive when filtering', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('READ');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].id).toBe('2');
  });

  it('returns empty array when no tasks match the search term', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('zzznomatch');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });

  it('restores all tasks when search term is cleared', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('buy');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    act(() => {
      result.current.setCompletedSearchTerm('');
    });
    expect(result.current.filteredCompletedTasks).toEqual(MOCK_TASKS);
  });

  it('returns all tasks when search term is only whitespace', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('   ');
    });
    expect(result.current.filteredCompletedTasks).toEqual(MOCK_TASKS);
  });

  it('exposes completedSearchTerm reflecting the current value', () => {
    const { result } = renderHook(() => useCompletedTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('laptop');
    });
    expect(result.current.completedSearchTerm).toBe('laptop');
  });
});
