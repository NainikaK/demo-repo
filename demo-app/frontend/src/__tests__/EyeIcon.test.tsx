import React from 'react';
import { render } from '@testing-library/react';
import { EyeIcon } from '../components/EyeIcon';

describe('EyeIcon', () => {
  it('renders an svg element', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has aria-hidden set to true', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies a custom className when provided', () => {
    const { container } = render(<EyeIcon className="inline-block w-[1em] h-[1em]" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('inline-block');
    expect(svg).toHaveClass('w-[1em]');
    expect(svg).toHaveClass('h-[1em]');
  });

  it('renders the eye path and circle elements', () => {
    const { container } = render(<EyeIcon />);
    const path = container.querySelector('path');
    const circle = container.querySelector('circle');
    expect(path).toBeInTheDocument();
    expect(circle).toBeInTheDocument();
  });

  it('has no click handler or interactive behaviour', () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toHaveAttribute('onClick');
    expect(svg).not.toHaveAttribute('tabindex');
    expect(svg).not.toHaveAttribute('role', 'button');
  });
});
