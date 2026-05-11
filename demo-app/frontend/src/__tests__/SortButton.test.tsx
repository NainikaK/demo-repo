import { render, screen, fireEvent } from '@testing-library/react';
import { SortButton } from '../components/SortButton';
import { LABEL_SORT_ASCENDING_ARIA, LABEL_SORT_DESCENDING_ARIA } from '../utils/strings';

describe('SortButton', () => {
  it('renders an upward arrow and ascending aria-label when sortDirection is asc', () => {
    const onClick = jest.fn();
    render(<SortButton sortDirection="asc" onClick={onClick} />);
    const button = screen.getByRole('button', { name: LABEL_SORT_ASCENDING_ARIA });
    expect(button).toBeInTheDocument();
  });

  it('renders a downward arrow and descending aria-label when sortDirection is desc', () => {
    const onClick = jest.fn();
    render(<SortButton sortDirection="desc" onClick={onClick} />);
    const button = screen.getByRole('button', { name: LABEL_SORT_DESCENDING_ARIA });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<SortButton sortDirection="asc" onClick={onClick} />);
    const button = screen.getByRole('button', { name: LABEL_SORT_ASCENDING_ARIA });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
