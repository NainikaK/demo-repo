import { renderHook, act } from '@testing-library/react';
import { useCompletedTaskSearch } from '../hooks/useCompletedTaskSearch';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
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
    title: 'Buy flowers',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'high',
  },
];

describe('useCompletedTaskSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });

  it('filters tasks case-insensitively by title', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));
    act(() => {
      result.current.setCompletedSearchTerm('buy');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    expect(result.current.filteredCompletedTasks.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('filters tasks case-insensitively with uppercase input', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));
    act(() => {
      result.current.setCompletedSearchTerm('READ');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].id).toBe('2');
  });

  it('returns empty array when no tasks match', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));
    act(() => {
      result.current.setCompletedSearchTerm('zzz');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });

  it('restores all tasks when search term is cleared', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));
    act(() => {
      result.current.setCompletedSearchTerm('buy');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(2);
    act(() => {
      result.current.setCompletedSearchTerm('');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(3);
  });

  it('initialises completedSearchTerm to empty string', () => {
    const tasks = makeTasks();
    const { result } = renderHook(() => useCompletedTaskSearch(tasks));
    expect(result.current.completedSearchTerm).toBe('');
  });
});
