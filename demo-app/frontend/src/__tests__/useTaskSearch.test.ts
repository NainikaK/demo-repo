import { renderHook, act } from '@testing-library/react';
import { useTaskSearch } from '../hooks/useTaskSearch';
import type { Task } from '../types';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Fix login bug',
    completed: false,
    createdAt: '2024-01-01T00:00:00Z',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Write unit tests',
    completed: false,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Deploy to production',
    completed: false,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'low',
  },
];

describe('useTaskSearch', () => {
  it('initialises with an empty searchTerm and returns all tasks', () => {
    const { result } = renderHook(() => useTaskSearch(MOCK_TASKS));
    expect(result.current.searchTerm).toBe('');
    expect(result.current.filteredTasks).toEqual(MOCK_TASKS);
  });

  it('filters tasks by case-insensitive title match', () => {
    const { result } = renderHook(() => useTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('login');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('1');
  });

  it('is case-insensitive', () => {
    const { result } = renderHook(() => useTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('UNIT');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('2');
  });

  it('returns empty array when no tasks match', () => {
    const { result } = renderHook(() => useTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('xyzzy');
    });
    expect(result.current.filteredTasks).toHaveLength(0);
  });

  it('returns all tasks when searchTerm is reset to empty string', () => {
    const { result } = renderHook(() => useTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('login');
    });
    act(() => {
      result.current.setSearchTerm('');
    });
    expect(result.current.filteredTasks).toEqual(MOCK_TASKS);
  });

  it('filters on every character change without a minimum threshold', () => {
    const { result } = renderHook(() => useTaskSearch(MOCK_TASKS));
    act(() => {
      result.current.setSearchTerm('D');
    });
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('3');
  });
});
