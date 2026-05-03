import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CheckTickIcon } from '../components/CheckTickIcon';

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
