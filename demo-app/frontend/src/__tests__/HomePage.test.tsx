import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HomePage } from '../pages/HomePage';

vi.mock('../components/TaskForm', () => ({
  TaskForm: ({ onTaskCreated }: { onTaskCreated: (t: unknown) => void }) => (
    <div data-testid="task-form" />
  ),
}));

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-card" />
  ),
}));

vi.mock('../components/LoadMoreButton', () => ({
  LoadMoreButton: ({ onClick, visible }: { onClick: () => void; visible: boolean }) =>
    visible ? (
      <button data-testid="load-more-button" onClick={onClick}>
        Load More
      </button>
    ) : null,
}));

vi.mock('../components/SmileyIcon', () => ({
  SmileyIcon: () => <span data-testid="smiley-icon" />,
}));

vi.mock('../components/EyeIcon', () => ({
  EyeIcon: () => <span data-testid="eye-icon" />,
}));

vi.mock('../hooks/useUpcomingTasks', () => ({
  useUpcomingTasks: vi.fn(),
}));

import * as useUpcomingTasksModule from '../hooks/useUpcomingTasks';

const defaultHookValue = {
  visibleTasks: [
    { id: '1', title: 'Task One', description: '', completed: false, createdAt: '2024-01-01T00:00:00.000Z' },
  ],
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
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue(defaultHookValue);

    render(<HomePage />);

    expect(screen.getByText('Upcoming Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
  });

  it('interaction test - clicking the load more button calls loadMore', async () => {
    const loadMore = vi.fn();
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...defaultHookValue,
      hasMore: true,
      loadMore,
    });

    render(<HomePage />);

    const loadMoreButton = screen.getByTestId('load-more-button');
    await userEvent.click(loadMoreButton);

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders the EyeIcon in the same heading element as the Upcoming Tasks text', () => {
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue(defaultHookValue);

    render(<HomePage />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Upcoming Tasks');

    const eyeIcon = screen.getByTestId('eye-icon');
    expect(heading).toContainElement(eyeIcon);
  });
});
