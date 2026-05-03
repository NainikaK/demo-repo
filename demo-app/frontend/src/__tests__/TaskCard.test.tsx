import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '../types';

vi.mock('../components/AssigneeAvatar', () => ({
  AssigneeAvatar: ({ name }: { name: string }) => (
    <span data-testid="assignee-avatar" aria-label={name} />
  ),
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

const baseTask: Task = {
  id: 'task-1',
  title: 'Test Task',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'medium',
};

describe('TaskCard', () => {
  it('render test - renders the task title and comment button when onCommentClick is provided', () => {
    render(
      <TaskCard
        task={baseTask}
        commentCount={3}
        onCommentClick={vi.fn()}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByTestId('comment-button')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('interaction test - calls onCommentClick with the task when the comment button is clicked', async () => {
    const onCommentClick = vi.fn();
    render(
      <TaskCard
        task={baseTask}
        commentCount={2}
        onCommentClick={onCommentClick}
      />
    );

    const commentButton = screen.getByTestId('comment-button');
    await userEvent.click(commentButton);

    expect(onCommentClick).toHaveBeenCalledTimes(1);
    expect(onCommentClick).toHaveBeenCalledWith(baseTask);
  });

  it('edge case - does not render comment button when onCommentClick is not provided', () => {
    render(<TaskCard task={baseTask} />);

    expect(screen.queryByTestId('comment-button')).not.toBeInTheDocument();
  });
});
