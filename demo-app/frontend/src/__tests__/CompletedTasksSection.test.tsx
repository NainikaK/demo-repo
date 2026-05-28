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
  it('render test - renders the section heading with checkmark icon having the correct aria-label', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={mocks.onComplete}
        selectedPriority={null}
        onPriorityChange={mocks.onPriorityChange}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    const checkmarkIcon = screen.getByRole('img', { name: 'Completed tasks checkmark icon' });
    expect(checkmarkIcon).toBeInTheDocument();
  });

  it('interaction test - clicking the toggle button collapses and hides the task list', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={mocks.onComplete}
        selectedPriority={null}
        onPriorityChange={mocks.onPriorityChange}
      />
    );

    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    const collapseButton = screen.getByRole('button', { name: 'Collapse completed tasks' });
    await userEvent.click(collapseButton);

    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });

  it('edge case - renders empty message and no task cards when completedTasks is an empty array', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={mocks.onComplete}
        selectedPriority={null}
        onPriorityChange={mocks.onPriorityChange}
      />
    );

    expect(screen.getByText('No completed tasks yet')).toBeInTheDocument();
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });
});
