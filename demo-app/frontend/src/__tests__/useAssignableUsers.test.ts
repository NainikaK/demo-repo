import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useComments } from '../hooks/useComments';

vi.mock('../utils/constants', () => ({
  COMMENTS_URL: vi.fn((taskId: string) => `/api/v1/tasks/${taskId}/comments`),
  COMMENT_MAX_LENGTH: 500,
}));

describe('useComments', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success case - returns users array when fetch succeeds', async () => {
    const mockComments = [
      { id: '1', taskId: 'task1', text: 'Hello', createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', taskId: 'task1', text: 'World', createdAt: '2024-01-02T00:00:00Z' },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockComments,
    });

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task1');
    });

    await waitFor(() => expect(result.current.fetchLoading).toBe(false));

    expect(result.current.comments).toEqual(mockComments);
    expect(result.current.fetchError).toBeNull();
  });

  it('error case - sets error and returns empty users when fetch response is not ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task1');
    });

    await waitFor(() => expect(result.current.fetchLoading).toBe(false));

    expect(result.current.comments).toEqual([]);
    expect(result.current.fetchError).not.toBeNull();
  });

  it('loading state - fetchLoading is true while fetchComments is in flight', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useComments());

    act(() => {
      result.current.fetchComments('task1');
    });

    await waitFor(() => expect(result.current.fetchLoading).toBe(true));

    await act(async () => {
      resolve({ ok: true, json: async () => [] });
    });
    await waitFor(() => expect(result.current.fetchLoading).toBe(false));
  });
});
