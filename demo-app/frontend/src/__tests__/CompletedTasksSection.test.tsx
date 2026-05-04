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
  PriorityFilter: ({
    selectedPriority,
    onChange,
  }: {
    selectedPriority: string | null;
    onChange: (p: string | null) => void;
  }) => (
    <select
      data-testid="priority-filter"
      value={selectedPriority ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value as 'low' | 'medium' | 'high')}
      aria-label="Filter tasks by priority"
    >
      <option value="">All Priorities</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
  ),
}));

const baseTask: Task = {
  id: 'task-1',
  title: 'Completed Task One',
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'medium',
};

describe('CompletedTasksSection', () => {
  it('render test - renders the heading and PriorityFilter when given valid props', () => {
    render(
      <CompletedTasksSection
        completedTasks={[baseTask]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('priority-filter')).toBeInTheDocument();
    expect(screen.getByTestId('task-card')).toBeInTheDocument();
  });

  it('interaction test - calls onPriorityChange when a priority is selected in the filter', async () => {
    const onPriorityChange = vi.fn();
    render(
      <CompletedTasksSection
        completedTasks={[baseTask]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={onPriorityChange}
      />
    );

    const select = screen.getByTestId('priority-filter');
    await userEvent.selectOptions(select, 'high');

    expect(onPriorityChange).toHaveBeenCalledWith('high');
  });

  it('edge case - displays no-priority message when completedTasks is empty and a priority is selected', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority="high"
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('No tasks in this priority yet')).toBeInTheDocument();
  });
});
