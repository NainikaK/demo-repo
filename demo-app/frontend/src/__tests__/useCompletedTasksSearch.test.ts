import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const makeTasks = (): Task[] => [
  {
    id: '1',
    title: 'Buy groceries',
    completed: true,
    createdAt: '2024-01-01',
    priority: 'low',
  },
  {
    id: '2',
    title: 'TASK alpha',
    completed: true,
    createdAt: '2024-01-02',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Task beta',
    completed: true,
    createdAt: '2024-01-03',
    priority: 'high',
  },
  {
    id: '4',
    title: 'task gamma',
    completed: true,
    createdAt: '2024-01-04',
    priority: 'low',
  },
];

describe('useCompletedTasksSearch', () => {
  it('initialises completedSearchTerm as empty string', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());
    expect(result.current.completedSearchTerm).toBe('');
  });

  it('returns all tasks when search term is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());
    const tasks = makeTasks();
    expect(result.current.filterBySearchTerm(tasks)).toHaveLength(tasks.length);
  });

  it('returns all tasks when search term is whitespace only', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());
    act(() => {
      result.current.setCompletedSearchTerm('   ');
    });
    const tasks = makeTasks();
    expect(result.current.filterBySearchTerm(tasks)).toHaveLength(tasks.length);
  });

  it('filters tasks by title case-insensitively', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());
    act(() => {
      result.current.setCompletedSearchTerm('task');
    });
    const filtered = result.current.filterBySearchTerm(makeTasks());
    expect(filtered).toHaveLength(3);
    expect(filtered.map((t) => t.id)).toEqual(['2', '3', '4']);
  });

  it('matches upper-case search term against lower-case titles', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());
    act(() => {
      result.current.setCompletedSearchTerm('GROCERIES');
    });
    const filtered = result.current.filterBySearchTerm(makeTasks());
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('returns empty array when no tasks match', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());
    act(() => {
      result.current.setCompletedSearchTerm('zzznomatch');
    });
    expect(result.current.filterBySearchTerm(makeTasks())).toHaveLength(0);
  });

  it('returns all tasks after search term is cleared', () => {
    const { result } = renderHook(() => useCompletedTasksSearch());
    act(() => {
      result.current.setCompletedSearchTerm('task');
    });
    act(() => {
      result.current.setCompletedSearchTerm('');
    });
    expect(result.current.filterBySearchTerm(makeTasks())).toHaveLength(4);
  });
});
