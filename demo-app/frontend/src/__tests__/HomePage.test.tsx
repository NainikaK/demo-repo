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

const defaultHookReturn = {
  visibleTasks: [] as Task[],
  hasMore: false,
  loading: false,
  error: null,
  completeError: null,
  refetch: vi.fn(),
  addTask: vi.fn(),
  completeTask: vi.fn(),
  loadMore: vi.fn(),
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders without crashing and shows the tasks heading when tasks are present', () => {
    const tasks = [makeTask('1'), makeTask('2')];
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...defaultHookReturn,
      visibleTasks: tasks,
    });

    render(<HomePage />);

    expect(screen.getByText('Upcoming Tasks')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('interaction test - clicking the retry button calls refetch when there is an error', async () => {
    const refetch = vi.fn();
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...defaultHookReturn,
      error: 'Network failure',
      refetch,
    });

    render(<HomePage />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders the upcoming tasks list with overflow-y-auto and max-h-[150px] classes applied', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => makeTask(String(i + 1)));
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...defaultHookReturn,
      visibleTasks: tasks,
    });

    render(<HomePage />);

    const list = screen.getByRole('list');
    expect(list).toHaveClass('overflow-y-auto');
    expect(list).toHaveClass('max-h-[150px]');
  });
});
