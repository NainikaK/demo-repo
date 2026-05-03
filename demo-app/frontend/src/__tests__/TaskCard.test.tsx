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
  DueDateBadge: ({ dueDate }: { dueDate?: string }) => (
    dueDate ? <span data-testid="due-date-badge" /> : null
  ),
}));

function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const baseTask: Task = {
  id: 'task-1',
  title: 'Test Task Title',
  completed: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  priority: 'medium',
};

describe('TaskCard', () => {
  it('render test - renders the task title without crashing given valid props', () => {
    render(<TaskCard task={baseTask} />);

    expect(screen.getByText('Test Task Title')).toBeInTheDocument();
  });

  it('interaction test - calls onComplete with the task id when the Mark Complete button is clicked', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<TaskCard task={baseTask} onComplete={onComplete} />);

    const button = screen.getByRole('button', { name: /Mark task as complete: Test Task Title/i });
    await userEvent.click(button);

    expect(onComplete).toHaveBeenCalledWith('task-1');
  });

  it('edge case - renders without crashing when optional props are absent', () => {
    const minimalTask: Task = {
      id: 'task-min',
      title: 'Minimal Task',
      completed: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      priority: 'low',
    };
    render(<TaskCard task={minimalTask} />);

    expect(screen.getByText('Minimal Task')).toBeInTheDocument();
    expect(screen.queryByTestId('assignee-avatar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders DueDateBadge when task has a dueDate', () => {
    const taskWithDueDate: Task = {
      ...baseTask,
      dueDate: getTodayString(),
    };
    render(<TaskCard task={taskWithDueDate} />);

    expect(screen.getByTestId('due-date-badge')).toBeInTheDocument();
  });

  it('does not render DueDateBadge when the task is completed', () => {
    const completedTask: Task = {
      ...baseTask,
      completed: true,
      dueDate: getTodayString(),
    };
    render(<TaskCard task={completedTask} />);

    expect(screen.queryByTestId('due-date-badge')).not.toBeInTheDocument();
  });

  it('renders Completed badge when task is completed', () => {
    const completedTask: Task = {
      ...baseTask,
      completed: true,
    };
    render(<TaskCard task={completedTask} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
