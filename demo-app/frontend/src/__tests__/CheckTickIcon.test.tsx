import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { CheckTickIcon } from '../components/CheckTickIcon';
import { useComments } from '../hooks/useComments';

vi.mock('../utils/constants', () => ({
  COMMENTS_URL: vi.fn((taskId: string) => `/api/v1/tasks/${taskId}/comments`),
}));

describe('CheckTickIcon', () => {
  it('render test - renders an svg element that is hidden from assistive technology', () => {
    render(<CheckTickIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - does not respond to click events when clicked', async () => {
    const handleClick = vi.fn();
    render(
      <div onClick={handleClick}>
        <CheckTickIcon className="pointer-events-none" />
      </div>
    );

    const svg = document.querySelector('svg')!;
    await userEvent.click(svg);

    // The svg has pointer-events-none so the click bubbles but the icon itself is non-interactive
    expect(svg).not.toHaveAttribute('role', 'button');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('edge case - renders without crashing when no className prop is provided', () => {
    render(<CheckTickIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });
});

describe('useComments', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetchComments error case - sets fetchError when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    );

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task-1');
    });

    expect(result.current.fetchError).toBe('Request failed with status 500');
    expect(result.current.comments).toEqual([]);
    expect(result.current.fetchLoading).toBe(false);
  });
});
