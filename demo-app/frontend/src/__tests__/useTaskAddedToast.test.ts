import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { useTaskAddedToast } from '../hooks/useTaskAddedToast';

describe('useTaskAddedToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('success case - triggerToast sets visible to true and fading to false immediately', () => {
    const { result } = renderHook(() => useTaskAddedToast());

    expect(result.current.visible).toBe(false);
    expect(result.current.fading).toBe(false);

    act(() => {
      result.current.triggerToast();
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.fading).toBe(false);
  });

  it('error case - after 1000ms fading becomes true and after another 300ms visible becomes false', () => {
    const { result } = renderHook(() => useTaskAddedToast());

    act(() => {
      result.current.triggerToast();
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.fading).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.fading).toBe(true);
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.visible).toBe(false);
    expect(result.current.fading).toBe(false);
  });

  it('loading state - calling triggerToast again before the first toast expires resets the timers and keeps visible true', () => {
    const { result } = renderHook(() => useTaskAddedToast());

    act(() => {
      result.current.triggerToast();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Second trigger before the first expires
    act(() => {
      result.current.triggerToast();
    });

    // After another 500ms (only 500ms into the new 1000ms window), should still be visible and not fading
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.fading).toBe(false);
  });
});
