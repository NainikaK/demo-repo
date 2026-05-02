import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EyeIcon } from '../components/EyeIcon';

describe('EyeIcon', () => {
  it('render test - renders an svg with aria-hidden and default inline-block class', () => {
    render(<EyeIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('inline-block');
  });

  it('interaction test - applies a custom className when provided, overriding the default', () => {
    render(<EyeIcon className="custom-class" />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('custom-class');
    expect(svg).not.toHaveClass('inline-block');
  });

  it('edge case - renders without crashing when no props are provided', () => {
    render(<EyeIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });
});
