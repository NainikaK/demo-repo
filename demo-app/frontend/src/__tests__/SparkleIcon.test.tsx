import { render, screen } from '@testing-library/react';
import React from 'react';
import { SparkleIcon } from '../components/SparkleIcon';

describe('SparkleIcon', () => {
  it('renders an svg element', () => {
    const { container } = render(<SparkleIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('applies className prop when provided', () => {
    const { container } = render(<SparkleIcon className="w-6 h-6" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-6');
    expect(svg).toHaveClass('h-6');
  });

  it('has aria-hidden set to true', () => {
    const { container } = render(<SparkleIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('has focusable set to false', () => {
    const { container } = render(<SparkleIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('does not have any click event handler', () => {
    const { container } = render(<SparkleIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const onClickAttr = svg?.onclick;
    expect(onClickAttr).toBeUndefined();
  });

  it('does not render any interactive role', () => {
    const { container } = render(<SparkleIcon />);
    const interactive = container.querySelector('[role="button"], [tabindex]');
    expect(interactive).toBeNull();
  });

  it('is not queryable as a button or link', () => {
    render(<SparkleIcon />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
