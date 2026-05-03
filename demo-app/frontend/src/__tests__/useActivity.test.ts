import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useActivity } from '../hooks/useActivity';

describe('useActivity', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success case - returns activity entries when fetch succeeds', async () => {
    const mockEntries = [
      { id: '1', taskId: 'task-1', description: 'Task created', createdAt: '2024-01-10T09:00:00.000Z' },
      { id: '2', taskId: 'task-1', description: 'Comment added', createdAt: '2024-01-11T10:00:00.000Z' },
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

  it('error case - sets fetchError and returns empty entries when fetch response is not ok', async () => {
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
    expect(result.current.fetchError).toBe('Request failed with status 500');
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
