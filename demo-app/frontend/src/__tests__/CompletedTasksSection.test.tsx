import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

interface TaskCardMockProps {
  task: Task;
}

interface PriorityFilterMockProps {
  selectedPriority: string | null;
  onChange: (p: string | null) => void;
}

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: TaskCardMockProps) => (
    <div data-testid="task-card">{task.title}</div>
  ),
}));

vi.mock('../components/PriorityFilter', () => ({
  PriorityFilter: ({
    selectedPriority,
    onChange,
  }: PriorityFilterMockProps) => (
    <div data-testid="priority-filter" data-selected={selectedPriority ?? ''}>
      <button onClick={() => onChange('high')}>High</button>
      <button onClick={() => onChange(null)}>All</button>
    </div>
  ),
}));

const makeTask = (id: string): Task => ({
  id,
  title: `Task ${id}`,
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'medium',
});

describe('CompletedTasksSection', () => {
  it('render test - renders the section heading and a list of completed tasks', () => {
    const tasks = [makeTask('1'), makeTask('2')];

    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(2);
  });

  it('interaction test - the task list container has the scrollable max-height classes applied', () => {
    const tasks = [makeTask('1'), makeTask('2'), makeTask('3')];

    render(
      <CompletedTasksSection
        completedTasks={tasks}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    const list = screen.getByRole('list');
    expect(list).toHaveClass('max-h-[200px]');
    expect(list).toHaveClass('overflow-y-auto');
  });

  it('edge case - renders the empty state message when completedTasks is an empty array', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('No completed tasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('edge case - renders priority empty state when no tasks match the selected priority', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority="high"
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByText('No tasks in this priority yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('render test - renders the priority filter control', () => {
    render(
      <CompletedTasksSection
        completedTasks={[]}
        onComplete={vi.fn()}
        selectedPriority={null}
        onPriorityChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('priority-filter')).toBeInTheDocument();
  });
});
