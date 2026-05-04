import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChevronIcon } from '../components/ChevronIcon';

describe('ChevronIcon', () => {
  it('render test - renders an svg with the down chevron path when isExpanded is true', () => {
    render(<ChevronIcon isExpanded={true} />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const path = document.querySelector('path');
    expect(path).toHaveAttribute('d', 'M19 9l-7 7-7-7');
  });

  it('interaction test - renders the right chevron path when isExpanded is false', () => {
    render(<ChevronIcon isExpanded={false} />);

    const path = document.querySelector('path');
    expect(path).toHaveAttribute('d', 'M9 5l7 7-7 7');
  });

  it('edge case - renders with aria-label and role img when ariaLabel prop is provided', () => {
    render(<ChevronIcon isExpanded={true} ariaLabel="Collapse completed tasks" />);

    const svg = screen.getByRole('img', { name: 'Collapse completed tasks' });
    expect(svg).toBeInTheDocument();
  });
});
