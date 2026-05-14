import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SmileyIcon } from '../components/SmileyIcon';

describe('SmileyIcon', () => {
  it('render test - renders a span with role img and aria-hidden true containing the smiley emoji', () => {
    render(<SmileyIcon />);

    const span = document.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span).toHaveAttribute('aria-hidden', 'true');
    expect(span).toHaveAttribute('role', 'img');
    expect(span).toHaveTextContent('\uD83D\uDE42');
  });

  it('interaction test - applies a provided className to the rendered span', () => {
    render(<SmileyIcon className="w-[1.5rem] h-[1.5rem] pointer-events-none" />);

    const span = document.querySelector('span');
    expect(span).toHaveClass('w-[1.5rem]');
    expect(span).toHaveClass('h-[1.5rem]');
    expect(span).toHaveClass('pointer-events-none');
  });

  it('edge case - renders without crashing when no className prop is provided', () => {
    render(<SmileyIcon />);

    const span = document.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span).not.toHaveAttribute('tabindex');
    expect(span?.onclick).toBeNull();
  });
});
