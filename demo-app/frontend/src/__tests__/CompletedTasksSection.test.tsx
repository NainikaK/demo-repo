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
  it('render test - renders the Completed Tasks heading and a checkmark svg icon next to it', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // The heading text is present
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Completed Tasks');

    // The checkmark svg is rendered inside the heading with its aria-label
    const svgs = heading.querySelectorAll('svg');
    // There should be at least one svg (the checkmark icon) inside the h2
    expect(svgs.length).toBeGreaterThanOrEqual(1);

    // The checkmark svg has an aria-label (LABEL_CHECK_TICK_ICON_ARIA)
    const checkSvg = Array.from(svgs).find(svg => svg.hasAttribute('aria-label'));
    expect(checkSvg).toBeDefined();
  });

  it('interaction test - clicking the toggle button collapses and hides the task list', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Section is expanded by default — task cards are visible
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    // Find the toggle button by aria-expanded attribute
    const toggleButton = screen.getByRole('button', { expanded: true });
    await userEvent.click(toggleButton);

    // After collapse, task cards are no longer rendered
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

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Completed Tasks');

    // The checkmark svg is still rendered even with no tasks
    const svgs = heading.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});
