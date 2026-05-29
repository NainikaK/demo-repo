import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageCheckmarkIcon } from '../components/PageCheckmarkIcon';

describe('PageCheckmarkIcon', () => {
  it('render test - renders a svg element with aria-hidden true so it is not announced by screen readers', () => {
    render(<PageCheckmarkIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('interaction test - applies provided className alongside the built-in pointer-events-none and cursor-default classes', () => {
    render(<PageCheckmarkIcon className="w-[1em] h-[1em] text-gray-800" />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // The className is forwarded to the lucide Check component which renders an svg
    // pointer-events-none and cursor-default are always present
    expect(svg?.className).toContain('pointer-events-none');
    expect(svg?.className).toContain('cursor-default');
    expect(svg?.className).toContain('w-[1em]');
  });

  it('edge case - renders without crashing when no className prop is provided', () => {
    render(<PageCheckmarkIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('focusable')).toBe('false');
  });
});
