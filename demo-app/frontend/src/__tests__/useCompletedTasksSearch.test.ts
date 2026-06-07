import { renderHook, act } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const makTask = (id: string, title: string): Task => ({
  id,
  title,
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'low',
});

const TASKS: Task[] = [
  makTask('1', 'Buy groceries'),
  makTask('2', 'Fix bug in login'),
  makTask('3', 'Write tests'),
];

describe('useCompletedTasksSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));
    expect(result.current.filteredCompletedTasks).toEqual(TASKS);
  });

  it('filters tasks by title (case-insensitive)', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('BUY');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].id).toBe('1');
  });

  it('returns empty array when no tasks match', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('zzznomatch');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(0);
  });

  it('restores full list when search term is cleared', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('bug');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    act(() => {
      result.current.setCompletedSearchTerm('');
    });
    expect(result.current.filteredCompletedTasks).toEqual(TASKS);
  });

  it('trims whitespace before filtering', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('  tests  ');
    });
    expect(result.current.filteredCompletedTasks).toHaveLength(1);
    expect(result.current.filteredCompletedTasks[0].id).toBe('3');
  });

  it('exposes completedSearchTerm reflecting current value', () => {
    const { result } = renderHook(() => useCompletedTasksSearch(TASKS));
    act(() => {
      result.current.setCompletedSearchTerm('hello');
    });
    expect(result.current.completedSearchTerm).toBe('hello');
  });
});
