import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddTasksSection } from '../components/AddTasksSection';

vi.mock('../components/TaskForm', () => ({
  TaskForm: () => <div data-testid="task-form" />,
}));

describe('AddTasksSection', () => {
  it('render test - renders the section heading and chevron button in the expanded state by default', () => {
    render(<AddTasksSection onTaskCreated={vi.fn()} />);

    expect(screen.getByText('Add tasks')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Collapse add tasks section' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('task-form')).toBeInTheDocument();
  });

  it('interaction test - clicking the chevron button collapses the section and clicking again expands it', async () => {
    render(<AddTasksSection onTaskCreated={vi.fn()} />);

    // Initially expanded — TaskForm should be visible
    expect(screen.getByTestId('task-form')).toBeInTheDocument();

    // Collapse
    const collapseButton = screen.getByRole('button', { name: 'Collapse add tasks section' });
    await userEvent.click(collapseButton);

    expect(screen.queryByTestId('task-form')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Expand add tasks section' })
    ).toBeInTheDocument();

    // Expand again
    const expandButton = screen.getByRole('button', { name: 'Expand add tasks section' });
    await userEvent.click(expandButton);

    expect(screen.getByTestId('task-form')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Collapse add tasks section' })
    ).toBeInTheDocument();
  });

  it('edge case - clicking the title text does not collapse the section', async () => {
    render(<AddTasksSection onTaskCreated={vi.fn()} />);

    // The title text is a <span> inside an <h2>, not a button
    const titleSpan = screen.getByText('Add tasks');
    await userEvent.click(titleSpan);

    // Section should still be expanded after clicking the title
    expect(screen.getByTestId('task-form')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Collapse add tasks section' })
    ).toBeInTheDocument();
  });
});
