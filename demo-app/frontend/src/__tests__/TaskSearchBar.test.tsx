import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskSearchBar } from '../components/TaskSearchBar';

describe('TaskSearchBar', () => {
  it('render test - renders an input with the correct placeholder and aria-label', () => {
    render(<TaskSearchBar value="" onChange={vi.fn()} />);

    const input = screen.getByRole('searchbox', { name: 'Search upcoming tasks by title' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search tasks...');
  });

  it('interaction test - calls onChange with the new value on every keystroke', async () => {
    const onChange = vi.fn();
    render(<TaskSearchBar value="" onChange={onChange} />);

    const input = screen.getByRole('searchbox', { name: 'Search upcoming tasks by title' });
    await userEvent.type(input, 'fix');

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenNthCalledWith(1, 'f');
    expect(onChange).toHaveBeenNthCalledWith(2, 'i');
    expect(onChange).toHaveBeenNthCalledWith(3, 'x');
  });

  it('edge case - renders without crashing when value is an empty string', () => {
    render(<TaskSearchBar value="" onChange={vi.fn()} />);

    const input = screen.getByRole('searchbox', { name: 'Search upcoming tasks by title' });
    expect(input).toHaveValue('');
  });
});
