import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SparkleIcon } from '../components/SparkleIcon';

describe('SparkleIcon', () => {
  it('render test - renders an svg element that is hidden from assistive technology and not focusable', () => {
    render(<SparkleIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - applies a provided className to the svg element and has no interactive attributes', () => {
    render(<SparkleIcon className="w-[1.5rem] h-[1.5rem] pointer-events-none" />);

    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('w-[1.5rem]');
    expect(svg).toHaveClass('h-[1.5rem]');
    expect(svg).toHaveClass('pointer-events-none');
    expect(svg).not.toHaveAttribute('role', 'button');
    expect(svg).not.toHaveAttribute('tabindex');
    expect(svg?.onclick).toBeNull();
  });

  it('edge case - renders without crashing when no className prop is provided', () => {
    render(<SparkleIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });
});
