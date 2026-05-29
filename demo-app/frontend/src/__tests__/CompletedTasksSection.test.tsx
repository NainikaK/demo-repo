import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: { title: string } }) => (
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
  it('render test - renders the heading text and a decorative checkmark svg with aria-hidden', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // The heading text should be present
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    // The decorative checkmark SVG must have aria-hidden="true"
    const svgs = document.querySelectorAll('svg');
    const checkmarkSvg = Array.from(svgs).find(
      (svg) => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('focusable') === 'false'
    );
    expect(checkmarkSvg).toBeDefined();
    expect(checkmarkSvg).toHaveAttribute('aria-hidden', 'true');
    expect(checkmarkSvg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - clicking the toggle button collapses the task list', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Initially expanded — task cards should be visible
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    // Click the toggle button to collapse
    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    // After collapse, task cards should no longer be in the DOM
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
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

    // Section should render and the checkmark SVG should be present and non-interactive
    const svgs = document.querySelectorAll('svg');
    const checkmarkSvg = Array.from(svgs).find(
      (svg) => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('focusable') === 'false'
    );
    expect(checkmarkSvg).toBeDefined();
    expect(checkmarkSvg).not.toHaveAttribute('role', 'button');
    expect(checkmarkSvg?.onclick).toBeNull();
  });
});
