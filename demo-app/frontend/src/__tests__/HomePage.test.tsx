import { render, screen } from '@testing-library/react';
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
  TaskCard: () => <div data-testid="task-card" />,
}));

vi.mock('../components/LoadMoreButton', () => ({
  LoadMoreButton: () => <div data-testid="load-more-button" />,
}));

vi.mock('../components/SmileyIcon', () => ({
  SmileyIcon: () => <div data-testid="smiley-icon" />,
}));

const baseHookReturn = {
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

  it('render test - renders the Upcoming Tasks heading with an eye SVG icon beside it', () => {
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...baseHookReturn,
    });

    render(<HomePage />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Upcoming Tasks');

    const svg = heading.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('interaction test - eye icon is non-interactive and has no button role or onClick handler', () => {
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...baseHookReturn,
    });

    render(<HomePage />);

    const heading = screen.getByRole('heading', { level: 2 });
    const svg = heading.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // The SVG should not be wrapped in a button
    const buttons = screen.queryAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).not.toContainElement(svg as HTMLElement);
    });

    // The SVG should not have a click handler attribute
    expect(svg).not.toHaveAttribute('onclick');
  });

  it('edge case - renders without crashing when visibleTasks is empty', () => {
    vi.spyOn(useUpcomingTasksModule, 'useUpcomingTasks').mockReturnValue({
      ...baseHookReturn,
      visibleTasks: [],
    });

    render(<HomePage />);

    expect(screen.getByText('No upcoming tasks.')).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 2 });
    const svg = heading.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
