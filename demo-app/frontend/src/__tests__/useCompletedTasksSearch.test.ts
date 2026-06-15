import { renderHook } from '@testing-library/react';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task } from '../types';

const makeTasks = (titles: string[]): Task[] =>
  titles.map((title, index) => ({
    id: String(index),
    title,
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'low' as const,
  }));

describe('useCompletedTasksSearch', () => {
  it('returns all tasks when searchTerm is empty', () => {
    const tasks = makeTasks(['Team Meeting', 'Code Review', 'Deploy App']);
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, ''),
    );
    expect(result.current).toHaveLength(3);
  });

  it('returns only tasks whose title matches the search term case-insensitively', () => {
    const tasks = makeTasks(['Team Meeting', 'Code Review', 'Deploy App']);
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, 'MEETING'),
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe('Team Meeting');
  });

  it('returns an empty array when no tasks match the search term', () => {
    const tasks = makeTasks(['Team Meeting', 'Code Review']);
    const { result } = renderHook(() =>
      useCompletedTasksSearch(tasks, 'xyz'),
    );
    expect(result.current).toHaveLength(0);
  });
});
