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
  it('render test - renders the heading with a decorative checkmark svg that is aria-hidden and not focusable', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // The heading must be present
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();

    // The checkmark SVG inside the heading must be aria-hidden (decorative)
    const svgs = heading.querySelectorAll('svg');
    // At least one SVG (the checkmark) should be inside the h2
    expect(svgs.length).toBeGreaterThan(0);

    // Find the checkmark svg — it has aria-hidden="true" and focusable="false"
    const checkmarkSvg = Array.from(svgs).find(
      (svg) => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('focusable') === 'false'
    );
    expect(checkmarkSvg).toBeTruthy();
    expect(checkmarkSvg).toHaveAttribute('aria-hidden', 'true');
    expect(checkmarkSvg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - clicking the chevron toggle button collapses and hides the completed tasks list', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Tasks are visible when expanded
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    // Click the toggle button to collapse
    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    // Tasks should no longer be visible
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
  });

  it('edge case - the checkmark svg has no onClick handler, no cursor-pointer, and no interactive role', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    const svgs = heading.querySelectorAll('svg');
    const checkmarkSvg = Array.from(svgs).find(
      (svg) => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('focusable') === 'false'
    ) as SVGElement | undefined;

    expect(checkmarkSvg).toBeTruthy();
    // No interactive role
    expect(checkmarkSvg!.getAttribute('role')).not.toBe('button');
    expect(checkmarkSvg!.getAttribute('role')).not.toBe('link');
    // No onClick handler attached directly
    expect(checkmarkSvg!.onclick).toBeNull();
    // Uses currentColor (same color as text) via stroke attribute
    expect(checkmarkSvg!).toHaveAttribute('stroke', 'currentColor');
    // Size matches text via em units
    expect(checkmarkSvg!).toHaveClass('w-[1em]');
    expect(checkmarkSvg!).toHaveClass('h-[1em]');
  });
});
