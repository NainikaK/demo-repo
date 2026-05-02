import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EyeIcon } from '../components/EyeIcon';

describe('EyeIcon', () => {
  it('render test - renders an SVG element', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('render test - SVG has aria-hidden set to true', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('render test - SVG uses currentColor for stroke', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('render test - applies default size classes when no className is provided', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('inline-block');
    expect(svg).toHaveClass('w-[1em]');
    expect(svg).toHaveClass('h-[1em]');
  });

  it('render test - applies custom className when provided', () => {
    const { container } = render(<EyeIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('interaction test - SVG has no onclick attribute', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toHaveAttribute('onclick');
  });

  it('render test - SVG contains the eye path and circle elements', () => {
    const { container } = render(<EyeIcon />);
    const path = container.querySelector('path');
    const circle = container.querySelector('circle');
    expect(path).toBeInTheDocument();
    expect(circle).toBeInTheDocument();
  });
});
