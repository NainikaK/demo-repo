import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => <div data-testid="task-card">{task.title}</div>,
}));

vi.mock('../components/PriorityFilter', () => ({
  PriorityFilter: () => <div data-testid="priority-filter" />,
}));

vi.mock('../components/ChevronIcon', () => ({
  ChevronIcon: ({ isExpanded }: { isExpanded: boolean }) => (
    <span data-testid="chevron-icon" data-expanded={String(isExpanded)} />
  ),
}));

const makeTask = (id: string): Task => ({
  id,
  title: `Completed Task ${id}`,
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'medium',
});

describe('CompletedTasksSection', () => {
  it('render test - renders the section heading and chevron icon by default', () => {
    render(
      <CompletedTasksSection
        completedTasks={[makeTask('1')]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument();
  });

  it('interaction test - clicking the chevron button collapses the task list and expands it again on second click', async () => {
    render(
      <CompletedTasksSection
        completedTasks={[makeTask('1')]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Initially expanded — task card should be visible
    expect(screen.getByTestId('task-card')).toBeInTheDocument();

    // Click the chevron button to collapse
    const toggleButton = screen.getByRole('button', { name: 'Collapse completed tasks' });
    await userEvent.click(toggleButton);

    // Task card should now be hidden
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();

    // Click again to expand
    const expandButton = screen.getByRole('button', { name: 'Expand completed tasks' });
    await userEvent.click(expandButton);

    expect(screen.getByTestId('task-card')).toBeInTheDocument();
  });

  it('edge case - renders empty state message when completedTasks array is empty and no priority is selected', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('No completed tasks yet')).toBeInTheDocument();
  });
});
