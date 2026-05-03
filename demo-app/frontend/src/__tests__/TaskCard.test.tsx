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
  CommentButton: ({ commentCount, onClick }: { commentCount: number; onClick: () => void }) => (
    <button data-testid="comment-button" onClick={onClick}>
      {commentCount}
    </button>
  ),
}));

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  completed: false,
  createdAt: '2024-01-01T10:00:00.000Z',
  priority: 'medium',
  ...overrides,
});

describe('TaskCard', () => {
  it('render test - renders the task title and comment button when onCommentClick is provided', () => {
    render(
      <TaskCard
        task={makeTask()}
        commentCount={4}
        onCommentClick={vi.fn()}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByTestId('comment-button')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('interaction test - calls onCommentClick with the task when comment button is clicked', async () => {
    const onCommentClick = vi.fn();
    const task = makeTask();
    render(
      <TaskCard
        task={task}
        commentCount={2}
        onCommentClick={onCommentClick}
      />
    );

    await userEvent.click(screen.getByTestId('comment-button'));

    expect(onCommentClick).toHaveBeenCalledTimes(1);
    expect(onCommentClick).toHaveBeenCalledWith(task);
  });

  it('edge case - renders without a comment button when onCommentClick is not provided', () => {
    render(<TaskCard task={makeTask()} />);

    expect(screen.queryByTestId('comment-button')).not.toBeInTheDocument();
  });
});
