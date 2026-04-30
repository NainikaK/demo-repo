import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HomePage } from '../pages/HomePage';
import * as useUpcomingTasksModule from '../hooks/useUpcomingTasks';
import type { Task } from '../types';

const makeTask = (id: string): Task => ({
  id,
  title: `Task ${id}`,
  description: `Description ${id}`,
  completed: false,
  createdAt: `2024-01-${id.padStart(2, '0')}T10:00:00.000Z`,
});

const defaultHookValue = {
  visibleTasks: [] as Task[],
  hasMore: false,
  loading: false,
  error: null as string | null,
  completeError: null as string | null,
  refetch: vi.fn(),
  addTask: vi.fn(),
  completeTask: vi.fn(),
  loadMore: vi.fn(),
};

vi.mock('../components/TaskForm', () => ({
  TaskForm: ({ onTaskCreated }: { onTaskCreated: (t: Task) => void }) => (
    <button onClick={() => onTaskCreated(makeTask('99'))}>Add Task</button>
  ),
}));

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => <div data-testid="task-card">{task.title}</div>,
}));

vi.mock('../components/LoadMoreButton', () => ({
  LoadMoreButton: ({ onClick, visible }: { onClick: () => void; visible: boolean }) =>
    visible ? <button onClick={onClick}>Load More</button> : null,
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the task list container with max-h-[200px] class when tasks are present', () => {
    const tasks = [makeTask('1'), makeTask('2')];
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...defaultHookValue,
      visibleTasks: tasks,
    });

    render(<HomePage />);

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(list.className).toContain('max-h-[200px]');
    expect(list.className).toContain('overflow-y-auto');
  });

  it('interaction test - calls loadMore when Load More button is clicked', async () => {
    const loadMore = vi.fn();
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...defaultHookValue,
      visibleTasks: [makeTask('1')],
      hasMore: true,
      loadMore,
    });

    render(<HomePage />);

    const loadMoreButton = screen.getByRole('button', { name: 'Load More' });
    await userEvent.click(loadMoreButton);

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders no-tasks message and no list when visibleTasks is empty', () => {
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...defaultHookValue,
      visibleTasks: [],
    });

    render(<HomePage />);

    expect(screen.getByText('No tasks found.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
