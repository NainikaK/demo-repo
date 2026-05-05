import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '../types';

vi.mock('../components/AssigneeAvatar', () => ({
  AssigneeAvatar: () => <span data-testid="assignee-avatar" />,
}));

vi.mock('../components/PriorityIcon', () => ({
  PriorityIcon: () => <span data-testid="priority-icon" />,
}));

vi.mock('../components/DueDateBadge', () => ({
  DueDateBadge: () => <span data-testid="due-date-badge" />,
}));

vi.mock('../components/CommentButton', () => ({
  CommentButton: () => <span data-testid="comment-button" />,
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    completed: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'medium',
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('render test - renders the task title and does not show the tick icon for an incomplete task', () => {
    const task = makeTask({ completed: false });
    render(<TaskCard task={task} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    // tick svg should not be present for incomplete tasks
    const svgs = document.querySelectorAll('svg');
    // The only SVGs rendered by mocked children are none; the tick icon should not exist
    // We verify by checking that no aria-label matching the tick icon label appears
    expect(screen.queryByLabelText('Task completed')).not.toBeInTheDocument();
  });

  it('render test - renders the tick icon beside the title when the task is completed', () => {
    const task = makeTask({ completed: true });
    render(<TaskCard task={task} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    // The tick svg is rendered with aria-label={LABEL_CHECK_TICK_ICON_ARIA}
    // From strings.ts the value is used as LABEL_CHECK_TICK_ICON_ARIA
    // Check the svg exists via its aria-label attribute
    const tickSvg = document.querySelector('svg[aria-label]');
    expect(tickSvg).toBeInTheDocument();
  });

  it('interaction test - clicking the Mark Complete button calls onComplete with the task id', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const task = makeTask({ completed: false });
    render(<TaskCard task={task} onComplete={onComplete} />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('task-1');
  });

  it('interaction test - clicking the Mark Complete button does nothing when task is already completed', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const task = makeTask({ completed: true });
    render(<TaskCard task={task} onComplete={onComplete} />);

    // No Mark Complete button for completed tasks; Completed badge is shown instead
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('edge case - renders without crashing when task has no optional fields', () => {
    const task = makeTask({
      completed: false,
      description: undefined,
      dueDate: undefined,
      assignedTo: undefined,
    });
    render(<TaskCard task={task} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('edge case - tick icon is not focusable and has pointer-events-none when task is completed', () => {
    const task = makeTask({ completed: true });
    render(<TaskCard task={task} />);

    const tickSvg = document.querySelector('svg[aria-label]') as SVGElement;
    expect(tickSvg).toBeInTheDocument();
    expect(tickSvg).toHaveAttribute('focusable', 'false');
    expect(tickSvg).toHaveClass('pointer-events-none');
  });
});
