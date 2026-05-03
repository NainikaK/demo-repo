import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PriorityFilter } from '../components/PriorityFilter';

describe('PriorityFilter', () => {
  it('render test - renders a select with all priority options and an all-priorities option', () => {
    render(<PriorityFilter selectedPriority={null} onChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Filter tasks by priority' });
    expect(select).toBeInTheDocument();
    expect(screen.getByText('All Priorities')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('interaction test - calls onChange with the selected priority when a priority option is chosen', async () => {
    const onChange = vi.fn();
    render(<PriorityFilter selectedPriority={null} onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Filter tasks by priority' });
    await userEvent.selectOptions(select, 'high');

    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('edge case - calls onChange with null when the all-priorities option is selected', async () => {
    const onChange = vi.fn();
    render(<PriorityFilter selectedPriority="medium" onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Filter tasks by priority' });
    await userEvent.selectOptions(select, '');

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
