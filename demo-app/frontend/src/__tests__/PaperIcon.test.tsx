import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaperIcon } from '../components/PaperIcon';

describe('PaperIcon', () => {
  it('render test - renders an svg element that is hidden from assistive technology and not focusable', () => {
    render(<PaperIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - applies a provided className to the svg element', () => {
    render(<PaperIcon className="w-[1em] h-[1em] pointer-events-none" />);

    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('w-[1em]');
    expect(svg).toHaveClass('h-[1em]');
    expect(svg).toHaveClass('pointer-events-none');
  });

  it('edge case - renders without crashing when no className prop is provided', () => {
    render(<PaperIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });
});
