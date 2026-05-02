import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EyeIcon } from '../components/EyeIcon';

describe('EyeIcon', () => {
  it('render test - renders an svg element that is hidden from assistive technology', () => {
    render(<EyeIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - applies a provided className to the svg element', () => {
    render(<EyeIcon className="inline-block w-[1em] h-[1em]" />);

    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('inline-block');
    expect(svg).toHaveClass('w-[1em]');
    expect(svg).toHaveClass('h-[1em]');
  });

  it('edge case - renders without crashing when no props are provided', () => {
    render(<EyeIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });
});
