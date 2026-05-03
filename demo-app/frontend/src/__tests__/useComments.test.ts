import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useComments } from '../hooks/useComments';

describe('useComments', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchComments', () => {
    it('success case - returns comments when fetch succeeds', async () => {
      const mockComments = [
        { id: '1', taskId: 'task-1', text: 'Hello', createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', taskId: 'task-1', text: 'World', createdAt: '2024-01-02T00:00:00Z' },
      ];
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      });

      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.fetchComments('task-1');
      });

      await waitFor(() => expect(result.current.fetchLoading).toBe(false));

      expect(result.current.comments).toEqual(mockComments);
      expect(result.current.fetchError).toBeNull();
    });

    it('error case - sets fetchError when response is not ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useComments());

      await act(async () => {
        await result.current.fetchComments('task-1');
      });

      await waitFor(() => expect(result.current.fetchLoading).toBe(false));

      expect(result.current.comments).toEqual([]);
      expect(result.current.fetchError).toBe('Failed to load comments. Please try again.');
    });

    it('loading state - fetchLoading is true while fetchComments is in flight', async () => {
      let resolve!: (value: unknown) => void;
      const pending = new Promise((r) => { resolve = r; });
      (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

      const { result } = renderHook(() => useComments());

      act(() => {
        result.current.fetchComments('task-1');
      });

      await waitFor(() => expect(result.current.fetchLoading).toBe(true));

      await act(async () => {
        resolve({ ok: true, json: async () => [] });
      });

      await waitFor(() => expect(result.current.fetchLoading).toBe(false));
    });
  });

  describe('postComment', () => {
    it('success case - returns new comment and appends it to comments list', async () => {
      const newComment = { id: 'c1', taskId: 'task-1', text: 'New comment', createdAt: '2024-01-03T00:00:00Z' };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => newComment,
      });

      const { result } = renderHook(() => useComments());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.postComment('task-1', 'New comment');
      });

      expect(returnValue).toEqual(newComment);
      expect(result.current.comments).toContainEqual(newComment);
    });

    it('error case - returns null when post response is not ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useComments());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.postComment('task-1', 'Bad comment');
      });

      expect(returnValue).toBeNull();
      expect(result.current.comments).toEqual([]);
    });

    it('loading state - initial comments list is empty before any post', () => {
      const { result } = renderHook(() => useComments());

      expect(result.current.comments).toEqual([]);
      expect(typeof result.current.postComment).toBe('function');
    });
  });
});
