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
  it('render test - renders the heading with a checkmark svg icon to its right', () => {
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

    // The checkmark SVG is rendered inside the h2 with an aria-label
    const checkmarkSvg = heading.querySelector('svg[aria-label]');
    expect(checkmarkSvg).toBeInTheDocument();

    // The SVG uses w-[1em] h-[1em] to match the font size of the heading text
    expect(checkmarkSvg).toHaveClass('w-[1em]');
    expect(checkmarkSvg).toHaveClass('h-[1em]');
  });

  it('interaction test - clicking the toggle button collapses the section and hides task cards', async () => {
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

    // Find the toggle button by its aria-expanded attribute
    const toggleButton = screen.getByRole('button', { expanded: true });
    await userEvent.click(toggleButton);

    // After collapse, task cards should no longer be rendered
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

    // Checkmark SVG is still rendered even with no tasks
    const checkmarkSvg = heading.querySelector('svg[aria-label]');
    expect(checkmarkSvg).toBeInTheDocument();

    // inline-block and align-middle classes ensure vertical alignment
    expect(checkmarkSvg).toHaveClass('inline-block');
    expect(checkmarkSvg).toHaveClass('align-middle');
  });
});
