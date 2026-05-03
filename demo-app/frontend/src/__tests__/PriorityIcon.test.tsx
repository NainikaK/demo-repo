import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriorityIcon } from '../components/PriorityIcon';

describe('PriorityIcon', () => {
  it('render test - renders an svg with the correct aria-label for medium priority', () => {
    render(<PriorityIcon priority="medium" />);

    const svg = screen.getByRole('img', { name: 'Priority: Medium' });
    expect(svg).toBeInTheDocument();
  });

  it('interaction test - renders the correct title attribute as tooltip text for high priority', () => {
    render(<PriorityIcon priority="high" />);

    const wrapper = document.querySelector('[title="High"]');
    expect(wrapper).toBeInTheDocument();
  });

  it('edge case - renders without crashing for low priority and applies blue color class', () => {
    render(<PriorityIcon priority="low" />);

    const svg = screen.getByRole('img', { name: 'Priority: Low' });
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-blue-400');
  });
});
