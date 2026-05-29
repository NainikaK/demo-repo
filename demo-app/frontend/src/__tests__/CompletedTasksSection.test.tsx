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
  it('render test - renders an aria-hidden decorative checkmark svg inside the heading alongside the section title', () => {
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

    // The decorative SVG inside the h2 must be aria-hidden and not focusable
    const svgsInsideHeading = heading.querySelectorAll('svg');
    // There is at least one SVG (the checkmark) inside the heading
    expect(svgsInsideHeading.length).toBeGreaterThanOrEqual(1);

    // Find the checkmark SVG: aria-hidden="true" and focusable="false"
    const checkmarkSvg = Array.from(svgsInsideHeading).find(
      (svg) =>
        svg.getAttribute('aria-hidden') === 'true' &&
        svg.getAttribute('focusable') === 'false',
    );
    expect(checkmarkSvg).toBeDefined();
    expect(checkmarkSvg).not.toBeNull();
  });

  it('interaction test - the checkmark svg has no onClick handler, no role button, and no cursor pointer, confirming it is purely decorative', () => {
    render(
      <CompletedTasksSection
        completedTasks={[makeTask('1'), makeTask('2')]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    const svgsInsideHeading = heading.querySelectorAll('svg');

    const checkmarkSvg = Array.from(svgsInsideHeading).find(
      (svg) =>
        svg.getAttribute('aria-hidden') === 'true' &&
        svg.getAttribute('focusable') === 'false',
    ) as SVGElement | undefined;

    expect(checkmarkSvg).toBeDefined();
    // No interactive role
    expect(checkmarkSvg!.getAttribute('role')).not.toBe('button');
    // No onclick handler on the element itself
    expect(checkmarkSvg!.onclick).toBeNull();
    // Not focusable via keyboard
    expect(checkmarkSvg!.getAttribute('focusable')).toBe('false');
    // No tabindex
    expect(checkmarkSvg!.getAttribute('tabindex')).toBeNull();
  });

  it('edge case - renders without crashing when completedTasks is an empty array and checkmark svg uses currentColor stroke matching the heading text color', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    const svgsInsideHeading = heading.querySelectorAll('svg');

    const checkmarkSvg = Array.from(svgsInsideHeading).find(
      (svg) =>
        svg.getAttribute('aria-hidden') === 'true' &&
        svg.getAttribute('focusable') === 'false',
    );

    expect(checkmarkSvg).toBeDefined();
    // stroke="currentColor" ensures it inherits the heading text colour
    expect(checkmarkSvg!.getAttribute('stroke')).toBe('currentColor');
    // w-[1em] h-[1em] ensures it matches the text size
    expect(checkmarkSvg!.classList.contains('w-[1em]')).toBe(true);
    expect(checkmarkSvg!.classList.contains('h-[1em]')).toBe(true);
  });
});
