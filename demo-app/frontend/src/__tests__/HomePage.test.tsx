import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HomePage } from '../pages/HomePage';
import * as useUpcomingTasksModule from '../hooks/useUpcomingTasks';
import type { Task } from '../types';

vi.mock('../components/TaskForm', () => ({
  TaskForm: ({ onTaskCreated }: { onTaskCreated: (t: Task) => void }) => (
    <div data-testid="task-form" />
  ),
}));

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => (
    <div data-testid={`task-card-${task.id}`} />
  ),
}));

vi.mock('../components/LoadMoreButton', () => ({
  LoadMoreButton: ({ onClick, visible }: { onClick: () => void; visible: boolean }) =>
    visible ? <button onClick={onClick}>Load More</button> : null,
}));

vi.mock('../components/SmileyIcon', () => ({
  SmileyIcon: () => <span data-testid="smiley-icon" />,
}));

vi.mock('../components/EyeIcon', () => ({
  EyeIcon: ({ className }: { className?: string }) => (
    <span data-testid="eye-icon" className={className} />
  ),
}));

const baseHookValue = {
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
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the Upcoming Tasks heading with the EyeIcon beside it', () => {
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue(baseHookValue);

    render(<HomePage />);

    expect(screen.getByText('Upcoming Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
  });

  it('interaction test - clicking Retry calls refetch when in error state', async () => {
    const refetch = vi.fn();
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...baseHookValue,
      error: 'Network failure',
      refetch,
    });

    render(<HomePage />);

    const retryButton = screen.getByRole('button', { name: 'Retry loading tasks' });
    await userEvent.click(retryButton);

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders loading state without crashing', () => {
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...baseHookValue,
      loading: true,
    });

    render(<HomePage />);

    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });
});
