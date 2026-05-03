import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useCompletedTasks } from '../hooks/useCompletedTasks';
import type { Task } from '../types';

const completedTask1: Task = {
  id: '1',
  title: 'Task One',
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  completedAt: '2024-03-01T10:00:00.000Z',
};

const completedTask2: Task = {
  id: '2',
  title: 'Task Two',
  completed: true,
  createdAt: '2024-01-02T00:00:00.000Z',
  completedAt: '2024-03-05T10:00:00.000Z',
};

const pendingTask: Task = {
  id: '3',
  title: 'Task Three',
  completed: false,
  createdAt: '2024-01-03T00:00:00.000Z',
};

describe('useCompletedTasks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success case - returns only completed tasks sorted descending by completedAt', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [pendingTask, completedTask1, completedTask2],
    });

    const { result } = renderHook(() => useCompletedTasks());

    await waitFor(() =>
      expect(result.current.completedTasks).toHaveLength(2)
    );

    expect(result.current.completedTasks[0].id).toBe('2');
    expect(result.current.completedTasks[1].id).toBe('1');
  });

  it('error case - returns an empty completedTasks array when the fetch fails', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCompletedTasks());

    await waitFor(() =>
      expect(
        (fetch as ReturnType<typeof vi.fn>).mock.calls.length
      ).toBeGreaterThan(0)
    );

    await waitFor(() => result.current.completedTasks !== undefined);

    expect(result.current.completedTasks).toHaveLength(0);
  });

  it('loading state - returns an empty completedTasks array while fetch is in flight', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useCompletedTasks());

    expect(result.current.completedTasks).toHaveLength(0);

    resolve({
      ok: true,
      json: async () => [completedTask1],
    });

    await waitFor(() =>
      expect(result.current.completedTasks).toHaveLength(1)
    );
  });
});
