import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => (
    <div data-testid="task-card" data-task-id={task.id} />
  ),
}));

const makeTask = (id: string, completedAt: string): Task => ({
  id,
  title: `Task ${id}`,
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  completedAt,
});

describe('CompletedTasksSection', () => {
  it('render test - renders the section heading and task cards when completed tasks are provided', () => {
    const tasks = [
      makeTask('1', '2024-03-01T10:00:00.000Z'),
      makeTask('2', '2024-03-02T10:00:00.000Z'),
    ];
    render(<CompletedTasksSection completedTasks={tasks} onComplete={vi.fn()} />);

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getAllByTestId('task-card')).toHaveLength(2);
  });

  it('interaction test - calls onComplete with the correct task id when a task card fires the callback', async () => {
    vi.mock('../components/TaskCard', () => ({
      TaskCard: ({ task, onComplete }: { task: Task; onComplete?: (id: string) => void }) => (
        <button data-testid="task-card" onClick={() => onComplete?.(task.id)}>{task.id}</button>
      ),
    }));

    const onComplete = vi.fn();
    const tasks = [makeTask('42', '2024-03-01T10:00:00.000Z')];
    render(<CompletedTasksSection completedTasks={tasks} onComplete={onComplete} />);

    const card = screen.getByTestId('task-card');
    await userEvent.click(card);

    expect(onComplete).toHaveBeenCalledWith('42');
  });

  it('edge case - renders the heading and empty message when completedTasks is an empty array', () => {
    render(<CompletedTasksSection completedTasks={[]} onComplete={vi.fn()} />);

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getByText('No completed tasks yet')).toBeInTheDocument();
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument();
  });
});
