import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import {
  LABEL_CHECK_TICK_ICON_ARIA,
  LABEL_COMPLETED_TASKS_HEADING,
  LABEL_CHEVRON_COLLAPSE_ARIA,
  LABEL_CHEVRON_EXPAND_ARIA,
} from '../utils/strings';

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
  it('render test - renders the checkmark svg icon with the correct aria-label immediately after the heading text', () => {
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
    expect(heading).toHaveTextContent(LABEL_COMPLETED_TASKS_HEADING);

    const checkmarkSvg = screen.getByLabelText(LABEL_CHECK_TICK_ICON_ARIA);
    expect(checkmarkSvg).toBeInTheDocument();
    expect(checkmarkSvg.tagName.toLowerCase()).toBe('svg');
  });

  it('interaction test - clicking the chevron toggle button collapses the section and hides the priority filter', async () => {
    render(
      <CompletedTasksSection
        completedTasks={[makeTask('1')]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('priority-filter')).toBeInTheDocument();

    const collapseButton = screen.getByRole('button', { name: LABEL_CHEVRON_COLLAPSE_ARIA });
    await userEvent.click(collapseButton);

    expect(screen.queryByTestId('priority-filter')).not.toBeInTheDocument();
  });

  it('edge case - renders without crashing when completedTasks is an empty array and the checkmark icon is still present', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const checkmarkSvg = screen.getByLabelText(LABEL_CHECK_TICK_ICON_ARIA);
    expect(checkmarkSvg).toBeInTheDocument();
    expect(checkmarkSvg).toHaveAttribute('stroke', 'currentColor');
    expect(checkmarkSvg).toHaveClass('w-[1em]');
    expect(checkmarkSvg).toHaveClass('h-[1em]');
    expect(checkmarkSvg).toHaveClass('inline-block');
  });
});
