import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useActivity } from '../hooks/useActivity';

vi.mock('../utils/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/constants')>();
  return {
    ...actual,
    ACTIVITY_URL: (taskId: string) => `/api/v1/tasks/${taskId}/activity`,
  };
});

describe('useActivity', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success case - returns activity entries when fetch succeeds', async () => {
    const mockEntries = [
      { id: 'a1', taskId: 'task-1', description: 'Task created', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'a2', taskId: 'task-1', description: 'Comment added', createdAt: '2024-01-02T00:00:00Z' },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntries,
    });

    const { result } = renderHook(() => useActivity());

    await act(async () => {
      await result.current.fetchActivity('task-1');
    });

    await waitFor(() => expect(result.current.fetchLoading).toBe(false));

    expect(result.current.entries).toEqual(mockEntries);
    expect(result.current.fetchError).toBeNull();
  });

  it('error case - sets fetchError and empties entries when response is not ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useActivity());

    await act(async () => {
      await result.current.fetchActivity('task-1');
    });

    await waitFor(() => expect(result.current.fetchLoading).toBe(false));

    expect(result.current.entries).toEqual([]);
    expect(result.current.fetchError).not.toBeNull();
    expect(result.current.fetchError).toContain('500');
  });

  it('loading state - fetchLoading is true while fetchActivity is in flight', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useActivity());

    act(() => {
      result.current.fetchActivity('task-1');
    });

    await waitFor(() => expect(result.current.fetchLoading).toBe(true));

    await act(async () => {
      resolve({ ok: true, json: async () => [] });
    });

    await waitFor(() => expect(result.current.fetchLoading).toBe(false));
  });
});
