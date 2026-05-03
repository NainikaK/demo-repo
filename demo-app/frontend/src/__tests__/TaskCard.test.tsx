import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '../types';

vi.mock('../components/PriorityIcon', () => ({
  PriorityIcon: () => <span data-testid="priority-icon" />,
}));

vi.mock('../components/AssigneeAvatar', () => ({
  AssigneeAvatar: () => <span data-testid="assignee-avatar" />,
}));

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  title: 'Test Task',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'medium',
  ...overrides,
});

describe('TaskCard', () => {
  it('render test - renders task title and priority icon', () => {
    render(<TaskCard task={makeTask()} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByTestId('priority-icon')).toBeInTheDocument();
  });

  it('interaction test - calls onComplete with the task id when the complete button is clicked', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<TaskCard task={makeTask()} onComplete={onComplete} />);

    const button = screen.getByRole('button', { name: /Mark task as complete/i });
    await userEvent.click(button);

    expect(onComplete).toHaveBeenCalledWith('1');
  });

  it('edge case - renders Completed badge and no complete button when task is already completed', () => {
    render(<TaskCard task={makeTask({ completed: true })} onComplete={vi.fn()} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
