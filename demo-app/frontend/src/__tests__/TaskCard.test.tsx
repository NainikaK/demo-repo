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

const baseTask: Task = {
  id: '1',
  title: 'Sample Task',
  completed: false,
  createdAt: '2024-01-10T09:00:00.000Z',
};

describe('TaskCard', () => {
  it('render test - renders the task title and shows an avatar when assignedTo is set', () => {
    const task: Task = { ...baseTask, assignedTo: 'Elsa' };
    render(<TaskCard task={task} />);

    expect(screen.getByText('Sample Task')).toBeInTheDocument();
    expect(screen.getByTestId('assignee-avatar')).toBeInTheDocument();
  });

  it('interaction test - calls onComplete with the task id when Mark Complete button is clicked', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<TaskCard task={baseTask} onComplete={onComplete} />);

    const button = screen.getByRole('button', { name: /mark task as complete/i });
    await userEvent.click(button);

    expect(onComplete).toHaveBeenCalledWith('1');
  });

  it('edge case - renders without crashing and shows no avatar when assignedTo is absent', () => {
    render(<TaskCard task={baseTask} />);

    expect(screen.getByText('Sample Task')).toBeInTheDocument();
    expect(screen.queryByTestId('assignee-avatar')).not.toBeInTheDocument();
  });
});
