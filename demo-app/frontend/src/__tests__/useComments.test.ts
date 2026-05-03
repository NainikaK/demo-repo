import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useComments } from '../hooks/useComments';

const mockComment = {
  id: 'c1',
  taskId: 'task-1',
  text: 'Test comment',
  createdAt: '2024-01-01T10:00:00.000Z',
};

describe('useComments', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success case - fetchComments sets comments when response is ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockComment],
    });

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task-1');
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].text).toBe('Test comment');
    expect(result.current.fetchError).toBeNull();
  });

  it('error case - fetchComments sets fetchError when response is not ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task-1');
    });

    expect(result.current.comments).toHaveLength(0);
    expect(result.current.fetchError).toBe('Failed to load comments. Please try again.');
  });

  it('loading state - fetchLoading is true while fetchComments is in flight', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useComments());

    let loadingDuringFetch = false;
    act(() => {
      result.current.fetchComments('task-1').then(() => {});
      loadingDuringFetch = result.current.fetchLoading;
    });

    resolve({ ok: true, json: async () => [] });
    await waitFor(() => expect(result.current.fetchLoading).toBe(false));

    expect(loadingDuringFetch).toBe(true);
  });

  it('success case - postComment returns the created comment and appends it to the list', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockComment,
    });

    const { result } = renderHook(() => useComments());

    let created;
    await act(async () => {
      created = await result.current.postComment('task-1', 'Test comment');
    });

    expect(created).toEqual(mockComment);
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].id).toBe('c1');
  });

  it('error case - postComment returns null when response is not ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    const { result } = renderHook(() => useComments());

    let created;
    await act(async () => {
      created = await result.current.postComment('task-1', 'Bad comment');
    });

    expect(created).toBeNull();
    expect(result.current.comments).toHaveLength(0);
  });
});
