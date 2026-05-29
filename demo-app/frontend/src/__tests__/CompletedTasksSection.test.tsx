import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

const mocks = vi.hoisted(() => ({
  onComplete: vi.fn(),
  onPriorityChange: vi.fn(),
}));

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
  it('render test - renders the heading and a check mark icon immediately to its right', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={mocks.onComplete}
        selectedPriority={null}
        onPriorityChange={mocks.onPriorityChange}
      />
    );

    // Heading text is visible
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Completed Tasks');

    // The SVG check mark icon has an aria-label and is inside the heading
    const checkIcon = heading.querySelector('svg[aria-label]');
    expect(checkIcon).toBeInTheDocument();
  });

  it('interaction test - clicking the collapse button hides the task list and priority filter', async () => {
    const tasks = [makeTask('1'), makeTask('2')];

    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={mocks.onComplete}
        selectedPriority={null}
        onPriorityChange={mocks.onPriorityChange}
      />
    );

    // Both task cards visible initially
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);
    expect(screen.getByTestId('priority-filter')).toBeInTheDocument();

    // Click the collapse button (aria-label from LABEL_CHEVRON_COLLAPSE_ARIA)
    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(collapseButton);

    // Task cards and filter should be hidden
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
    expect(screen.queryByTestId('priority-filter')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing and shows the check mark icon when completedTasks is empty', () => {
    const { container } = render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={mocks.onComplete}
        selectedPriority={null}
        onPriorityChange={mocks.onPriorityChange}
      />
    );

    expect(container.firstChild).not.toBeNull();

    // Check mark icon is present even with no tasks
    const heading = screen.getByRole('heading', { level: 2 });
    const checkIcon = heading.querySelector('svg[aria-label]');
    expect(checkIcon).toBeInTheDocument();

    // No task cards rendered
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
  });
});
