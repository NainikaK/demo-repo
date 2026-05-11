import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SortButton } from '../components/SortButton';
import {
  LABEL_SORT_ASCENDING_ARIA,
  LABEL_SORT_DESCENDING_ARIA,
} from '../utils/strings';

describe('SortButton', () => {
  it('render test - renders a button with the ascending aria-label when sortDirection is asc', () => {
    render(<SortButton sortDirection="asc" onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: LABEL_SORT_ASCENDING_ARIA });
    expect(button).toBeInTheDocument();
  });

  it('interaction test - calls onClick when the button is clicked', async () => {
    const onClick = vi.fn();
    render(<SortButton sortDirection="asc" onClick={onClick} />);

    const button = screen.getByRole('button', { name: LABEL_SORT_ASCENDING_ARIA });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders a button with the descending aria-label when sortDirection is desc', () => {
    render(<SortButton sortDirection="desc" onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: LABEL_SORT_DESCENDING_ARIA });
    expect(button).toBeInTheDocument();
  });
});
