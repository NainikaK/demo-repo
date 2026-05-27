import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import {
  LABEL_COMPLETED_TASKS_HEADING,
  LABEL_CHECK_TICK_ICON_ARIA,
  LABEL_CHEVRON_COLLAPSE_ARIA,
  LABEL_NO_COMPLETED_TASKS,
} from '../utils/strings';

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => (
    <div data-testid="task-card">{task.title}</div>
  ),
}));

vi.mock('../components/PriorityFilter', () => ({
  PriorityFilter: () => <div data-testid="priority-filter" />,
}));

vi.mock('../components/ChevronIcon', () => ({
  ChevronIcon: () => <span data-testid="chevron-icon" />,
}));

function makeTask(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'medium',
  };
}

describe('CompletedTasksSection', () => {
  it('render test - renders the heading text and checkmark icon inside the h2', () => {
    render(
      <CompletedTasksSection
        completedTasks={[makeTask('1')]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(LABEL_COMPLETED_TASKS_HEADING);

    const checkIcon = screen.getByRole('img', { name: LABEL_CHECK_TICK_ICON_ARIA });
    expect(checkIcon).toBeInTheDocument();
    expect(heading).toContainElement(checkIcon);
  });

  it('interaction test - clicking the toggle button collapses the task list', async () => {
    render(
      <CompletedTasksSection
        completedTasks={[makeTask('1'), makeTask('2')]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    const toggleButton = screen.getByRole('button', { name: LABEL_CHEVRON_COLLAPSE_ARIA });
    await userEvent.click(toggleButton);

    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing when completedTasks is empty and shows empty message', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS)).toBeInTheDocument();

    const checkIcon = screen.getByRole('img', { name: LABEL_CHECK_TICK_ICON_ARIA });
    expect(checkIcon).toBeInTheDocument();
  });
});
