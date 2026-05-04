import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskStatsDashboard } from '../components/TaskStatsDashboard';
import type { Task } from '../types';

const mocks = vi.hoisted(() => ({
  useTaskStats: vi.fn(),
}));

vi.mock('../hooks/useTaskStats', () => ({
  useTaskStats: mocks.useTaskStats,
}));

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    id: overrides.id,
    title: `Task ${overrides.id}`,
    completed: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'medium',
    ...overrides,
  };
}

describe('TaskStatsDashboard', () => {
  it('render test - renders all four stat tiles with correct labels and counts', () => {
    mocks.useTaskStats.mockReturnValue({
      total: 5,
      completed: 2,
      pending: 3,
      overdue: 1,
    });

    const tasks: Task[] = [
      makeTask({ id: '1' }),
      makeTask({ id: '2', completed: true }),
    ];

    render(<TaskStatsDashboard tasks={tasks} />);

    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('interaction test - updates displayed counts when tasks prop changes', () => {
    mocks.useTaskStats.mockReturnValue({
      total: 1,
      completed: 0,
      pending: 1,
      overdue: 0,
    });

    const tasks: Task[] = [makeTask({ id: '1' })];
    const { rerender } = render(<TaskStatsDashboard tasks={tasks} />);

    // total=1, pending=1 both show '1' — use getAllByText
    expect(screen.getAllByText('1')).toHaveLength(2);

    mocks.useTaskStats.mockReturnValue({
      total: 2,
      completed: 1,
      pending: 1,
      overdue: 0,
    });

    const updatedTasks: Task[] = [
      makeTask({ id: '1' }),
      makeTask({ id: '2', completed: true }),
    ];
    rerender(<TaskStatsDashboard tasks={updatedTasks} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('edge case - renders all four tiles showing zero when tasks array is empty', () => {
    mocks.useTaskStats.mockReturnValue({
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
    });

    render(<TaskStatsDashboard tasks={[]} />);

    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    // All four counts are 0 — use getAllByText since multiple tiles will show '0'
    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(4);
  });
});
