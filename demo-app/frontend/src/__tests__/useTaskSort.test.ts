import { renderHook, act } from '@testing-library/react';
import { useTaskSort } from '../hooks/useTaskSort';
import type { Task } from '../types';

const makeTask = (id: string, dueDate?: string): Task => ({
  id,
  title: `Task ${id}`,
  completed: false,
  createdAt: '2024-01-01T00:00:00Z',
  priority: 'medium',
  dueDate,
});

describe('useTaskSort', () => {
  it('initialises with sortDirection asc', () => {
    const { result } = renderHook(() => useTaskSort([]));
    expect(result.current.sortDirection).toBe('asc');
  });

  it('toggles sortDirection from asc to desc', () => {
    const { result } = renderHook(() => useTaskSort([]));
    act(() => {
      result.current.toggleSortDirection();
    });
    expect(result.current.sortDirection).toBe('desc');
  });

  it('toggles sortDirection from desc back to asc', () => {
    const { result } = renderHook(() => useTaskSort([]));
    act(() => {
      result.current.toggleSortDirection();
    });
    act(() => {
      result.current.toggleSortDirection();
    });
    expect(result.current.sortDirection).toBe('asc');
  });

  it('sorts tasks ascending by dueDate by default', () => {
    const tasks = [
      makeTask('b', '2024-03-01'),
      makeTask('a', '2024-01-01'),
      makeTask('c', '2024-02-01'),
    ];
    const { result } = renderHook(() => useTaskSort(tasks));
    const ids = result.current.sortedTasks.map((t) => t.id);
    expect(ids).toEqual(['a', 'c', 'b']);
  });

  it('sorts tasks descending when toggled', () => {
    const tasks = [
      makeTask('b', '2024-03-01'),
      makeTask('a', '2024-01-01'),
      makeTask('c', '2024-02-01'),
    ];
    const { result } = renderHook(() => useTaskSort(tasks));
    act(() => {
      result.current.toggleSortDirection();
    });
    const ids = result.current.sortedTasks.map((t) => t.id);
    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('places tasks with no dueDate at the bottom regardless of sort direction', () => {
    const tasks = [
      makeTask('no-date'),
      makeTask('early', '2024-01-01'),
      makeTask('late', '2024-12-01'),
    ];
    const { result } = renderHook(() => useTaskSort(tasks));

    const ascIds = result.current.sortedTasks.map((t) => t.id);
    expect(ascIds[ascIds.length - 1]).toBe('no-date');

    act(() => {
      result.current.toggleSortDirection();
    });

    const descIds = result.current.sortedTasks.map((t) => t.id);
    expect(descIds[descIds.length - 1]).toBe('no-date');
  });

  it('resets to asc on remount (no persistence)', () => {
    const { result, unmount } = renderHook(() => useTaskSort([]));
    act(() => {
      result.current.toggleSortDirection();
    });
    expect(result.current.sortDirection).toBe('desc');
    unmount();
    const { result: result2 } = renderHook(() => useTaskSort([]));
    expect(result2.current.sortDirection).toBe('asc');
  });
});
