import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import {
  LABEL_COMPLETED_TASKS_HEADING,
  LABEL_CHECK_TICK_ICON_ARIA,
  LABEL_NO_COMPLETED_TASKS,
} from '../utils/strings';
import type { Task } from '../types';

vi.mock('../components/TaskCard', () => ({
  TaskCard: () => <div data-testid="task-card" />,
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
  it('render test - renders the heading text and the check mark icon immediately to the right of it', () => {
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

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toContainElement(checkIcon as HTMLElement);
  });

  it('interaction test - clicking the chevron toggle button collapses the section and hides tasks', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(toggleButton);

    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing when completedTasks is empty and shows the empty state message', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS)).toBeInTheDocument();
    expect(screen.getByLabelText(LABEL_CHECK_TICK_ICON_ARIA)).toBeInTheDocument();
  });
});
