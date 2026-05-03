import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useAssignableUsers } from '../hooks/useAssignableUsers';

describe('useAssignableUsers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success case - returns users array when fetch succeeds', async () => {
    const mockUsers = ['Nainika K', 'Anna', 'Elsa', 'Sam D', 'Jacey'];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    });

    const { result } = renderHook(() => useAssignableUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
  });

  it('error case - sets error and returns empty users when fetch response is not ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useAssignableUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.users).toEqual([]);
    expect(result.current.error).toContain('500');
  });

  it('loading state - exposes loading as true while fetch is in flight', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useAssignableUsers());

    expect(result.current.loading).toBe(true);

    resolve({ ok: true, json: async () => [] });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
