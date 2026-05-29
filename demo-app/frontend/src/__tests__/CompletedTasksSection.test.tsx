import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

const mocks = vi.hoisted(() => ({
  PageCheckmarkIcon: vi.fn(),
}));

vi.mock('../components/PageCheckmarkIcon', () => ({
  PageCheckmarkIcon: (props: { className?: string }) => (
    <span data-testid="page-checkmark-icon" aria-hidden="true" />
  ),
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
  it('render test - renders the Completed Tasks heading and the PageCheckmarkIcon beside it', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('page-checkmark-icon')).toBeInTheDocument();
    // icon should be aria-hidden
    expect(screen.getByTestId('page-checkmark-icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('interaction test - clicking the chevron button collapses and hides the task list', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Initially expanded — task cards are visible
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    const collapseButton = screen.getByRole('button', { name: 'Collapse completed tasks' });
    await userEvent.click(collapseButton);

    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing when completedTasks is an empty array', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    // No task cards rendered
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });
});
