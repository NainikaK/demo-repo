import { renderHook } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const makeTasks = (titles: string[]): Task[] =>
  titles.map((title, index) => ({
    id: String(index),
    title,
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'low',
  }));

describe('useCompletedTasksSearch', () => {
  it('returns all tasks when search term is empty', () => {
    const tasks = makeTasks(['Team Meeting', 'Code Review', 'Deploy App']);
    const { result } = renderHook(() => useCompletedTasksSearch(tasks, ''));
    expect(result.current).toHaveLength(3);
  });

  it('returns all tasks when search term is only whitespace', () => {
    const tasks = makeTasks(['Team Meeting', 'Code Review']);
    const { result } = renderHook(() => useCompletedTasksSearch(tasks, '   '));
    expect(result.current).toHaveLength(2);
  });

  it('filters tasks by title in a case-insensitive manner', () => {
    const tasks = makeTasks(['Team Meeting', 'Code Review', 'meeting notes']);
    const { result } = renderHook(() => useCompletedTasksSearch(tasks, 'meeting'));
    expect(result.current).toHaveLength(2);
    expect(result.current.map((t) => t.title)).toEqual(['Team Meeting', 'meeting notes']);
  });

  it('returns empty array when no tasks match the search term', () => {
    const tasks = makeTasks(['Team Meeting', 'Code Review']);
    const { result } = renderHook(() => useCompletedTasksSearch(tasks, 'deploy'));
    expect(result.current).toHaveLength(0);
  });

  it('does not filter by fields other than title', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Alpha Task',
        description: 'meeting summary',
        completed: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        priority: 'high',
        assignedTo: 'meeting-user',
      },
    ];
    const { result } = renderHook(() => useCompletedTasksSearch(tasks, 'meeting'));
    expect(result.current).toHaveLength(0);
  });

  it('returns filtered tasks matching partial title', () => {
    const tasks = makeTasks(['Deploy App', 'Deploy Backend', 'Code Review']);
    const { result } = renderHook(() => useCompletedTasksSearch(tasks, 'Deploy'));
    expect(result.current).toHaveLength(2);
  });
});
