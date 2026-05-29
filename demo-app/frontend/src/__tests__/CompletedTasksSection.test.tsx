import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import {
  LABEL_COMPLETED_TASKS_HEADING,
  LABEL_CHECK_TICK_ICON_ARIA,
  LABEL_NO_COMPLETED_TASKS,
  LABEL_CHEVRON_COLLAPSE_ARIA,
} from '../utils/strings';
import type { Task } from '../types';

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
  it('render test - renders the heading and check mark icon with correct aria-label', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText(LABEL_COMPLETED_TASKS_HEADING)).toBeInTheDocument();
    const checkIcon = screen.getByLabelText(LABEL_CHECK_TICK_ICON_ARIA);
    expect(checkIcon).toBeInTheDocument();
    expect(checkIcon.tagName.toLowerCase()).toBe('svg');
  });

  it('interaction test - clicking the chevron toggle button collapses and hides the section content', async () => {
    render(
      <CompletedTasksSection
        completedTasks={[makeTask('1')]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('task-card')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: LABEL_CHEVRON_COLLAPSE_ARIA });
    await userEvent.click(toggleButton);

    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('priority-filter')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing when completedTasks is an empty array and shows empty message', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS)).toBeInTheDocument();
    const checkIcon = screen.getByLabelText(LABEL_CHECK_TICK_ICON_ARIA);
    expect(checkIcon).toBeInTheDocument();
  });
});
