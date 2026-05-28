import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
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

function makeTask(id: string, title: string): Task {
  return {
    id,
    title,
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'medium',
  };
}

describe('CompletedTasksSection', () => {
  it('render test - renders the heading text and a check mark icon with role img immediately after it', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();

    // The heading contains the completed tasks label text
    expect(heading).toHaveTextContent('Completed Tasks');

    // The check mark SVG has role="img" and aria-label matching LABEL_CHECK_TICK_ICON_ARIA
    const checkIcon = screen.getByRole('img', { name: 'Task completed' });
    expect(checkIcon).toBeInTheDocument();

    // The icon is inside the h2 heading element
    expect(heading).toContainElement(checkIcon as HTMLElement);
  });

  it('interaction test - clicking the toggle button collapses and hides the task list', async () => {
    const tasks = [makeTask('1', 'Finished Task')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Initially expanded - task card should be visible
    expect(screen.getByTestId('task-card')).toBeInTheDocument();

    // Click the collapse button
    const collapseButton = screen.getByRole('button', { name: 'Collapse completed tasks' });
    await userEvent.click(collapseButton);

    // After collapse the task card should not be rendered
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing when completedTasks is an empty array and check mark icon is still present', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Check mark icon is always rendered regardless of task count
    const checkIcon = screen.getByRole('img', { name: 'Task completed' });
    expect(checkIcon).toBeInTheDocument();

    // No task cards rendered when list is empty
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });
});
