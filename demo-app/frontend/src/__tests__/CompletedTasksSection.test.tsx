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
  it('render test - renders the heading text and a decorative aria-hidden checkmark svg', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // The heading text is rendered
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();

    // The decorative checkmark SVG is present with aria-hidden="true" and focusable="false"
    const svgs = document.querySelectorAll('svg');
    // There should be at least one svg (the checkmark)
    expect(svgs.length).toBeGreaterThan(0);

    // The checkmark SVG has aria-hidden="true"
    const checkmarkSvg = document.querySelector('svg[aria-hidden="true"]');
    expect(checkmarkSvg).toBeInTheDocument();
    expect(checkmarkSvg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - clicking the chevron button collapses and hides completed tasks content', async () => {
    const tasks = [makeTask('1'), makeTask('2')];
    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    // Initially expanded - task cards are visible
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);

    // Click the chevron button to collapse
    const chevronButton = screen.getByRole('button');
    await userEvent.click(chevronButton);

    // After collapse, task cards are no longer visible
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
  });

  it('edge case - the checkmark svg is purely decorative with no onClick, no interactive role, and no cursor pointer', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const checkmarkSvg = document.querySelector('svg[aria-hidden="true"]');
    expect(checkmarkSvg).toBeInTheDocument();

    // Not a button or interactive element
    expect(checkmarkSvg).not.toHaveAttribute('role', 'button');
    expect(checkmarkSvg).not.toHaveAttribute('tabindex');
    // No onClick handler on the element itself
    expect((checkmarkSvg as SVGElement).onclick).toBeNull();
    // The svg has the expected size classes for matching heading text
    expect(checkmarkSvg).toHaveClass('w-[1em]');
    expect(checkmarkSvg).toHaveClass('h-[1em]');
  });
});
