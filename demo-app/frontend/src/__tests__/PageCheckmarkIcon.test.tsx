import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageCheckmarkIcon } from '../components/PageCheckmarkIcon';

describe('PageCheckmarkIcon', () => {
  it('render test - renders without crashing and produces an svg element in the DOM', () => {
    render(<PageCheckmarkIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('interaction test - the svg has pointer-events-none and is not interactive', () => {
    const handleClick = vi.fn();
    render(
      <div onClick={handleClick}>
        <PageCheckmarkIcon />
      </div>
    );

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('pointer-events-none');
    expect(svg).not.toHaveAttribute('role', 'button');
    expect(svg).not.toHaveAttribute('tabindex');
    expect(svg?.onclick).toBeNull();
  });

  it('edge case - renders without crashing when no className prop is provided', () => {
    render(<PageCheckmarkIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
