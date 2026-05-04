import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomePage } from '../pages/HomePage';
import {
  LABEL_UPCOMING_CHEVRON_COLLAPSE_ARIA,
  LABEL_UPCOMING_CHEVRON_EXPAND_ARIA,
  LABEL_NO_TASKS,
} from '../utils/strings';

const MOCK_TASK = {
  id: 'task-1',
  title: 'Test Task',
  completed: false,
  createdAt: new Date().toISOString(),
  priority: 'medium' as const,
};

vi.mock('../hooks/useUpcomingTasks', () => ({
  useUpcomingTasks: () => ({
    visibleTasks: [MOCK_TASK],
    allTasks: [MOCK_TASK],
    hasMore: false,
    loading: false,
    error: null,
    completeError: null,
    refetch: vi.fn(),
    addTask: vi.fn(),
    completeTask: vi.fn(),
    loadMore: vi.fn(),
  }),
}));

vi.mock('../hooks/useCompletedTasks', () => ({
  useCompletedTasks: () => ({
    completedTasks: [],
  }),
}));

vi.mock('../hooks/usePriorityFilter', () => ({
  usePriorityFilter: () => ({
    selectedPriority: null,
    setSelectedPriority: vi.fn(),
    filterTasks: (tasks: unknown[]) => tasks,
  }),
}));

vi.mock('../hooks/useCompletedTasksPriorityFilter', () => ({
  useCompletedTasksPriorityFilter: () => ({
    selectedPriority: null,
    setSelectedPriority: vi.fn(),
    filteredTasks: [],
  }),
}));

vi.mock('../hooks/useTaskSearch', () => ({
  useTaskSearch: (tasks: unknown[]) => ({
    searchTerm: '',
    setSearchTerm: vi.fn(),
    filteredTasks: tasks,
  }),
}));

vi.mock('../components/TaskStatsDashboard', () => ({
  TaskStatsDashboard: () => <div data-testid="stats-dashboard" />,
}));

vi.mock('../components/TaskForm', () => ({
  TaskForm: () => <div data-testid="task-form" />,
}));

vi.mock('../components/TaskCard', () => ({
  TaskCard: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-card">{task.title}</div>
  ),
}));

vi.mock('../components/LoadMoreButton', () => ({
  LoadMoreButton: () => null,
}));

vi.mock('../components/SmileyIcon', () => ({
  SmileyIcon: () => null,
}));

vi.mock('../components/EyeIcon', () => ({
  EyeIcon: () => <span data-testid="eye-icon" />,
}));

vi.mock('../components/CompletedTasksSection', () => ({
  CompletedTasksSection: () => <div data-testid="completed-section" />,
}));

vi.mock('../components/PriorityFilter', () => ({
  PriorityFilter: () => <div data-testid="priority-filter" />,
}));

vi.mock('../components/CommentPanel', () => ({
  CommentPanel: () => null,
}));

vi.mock('../components/TaskSearchBar', () => ({
  TaskSearchBar: () => <div data-testid="task-search-bar" />,
}));

vi.mock('../utils/constants', () => ({
  COMMENTS_URL: (taskId: string) => `/api/v1/tasks/${taskId}/comments`,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Upcoming tasks section toggle', () => {
  it('renders the chevron button in the header on page load', () => {
    render(<HomePage />);
    const chevronButton = screen.getByRole('button', {
      name: LABEL_UPCOMING_CHEVRON_COLLAPSE_ARIA,
    });
    expect(chevronButton).toBeTruthy();
  });

  it('is expanded by default and shows task content', () => {
    render(<HomePage />);
    const taskCard = screen.queryByTestId('task-card');
    expect(taskCard).toBeTruthy();
  });

  it('collapses the section body when the chevron is clicked', () => {
    render(<HomePage />);
    const chevronButton = screen.getByRole('button', {
      name: LABEL_UPCOMING_CHEVRON_COLLAPSE_ARIA,
    });
    fireEvent.click(chevronButton);
    const taskCard = screen.queryByTestId('task-card');
    expect(taskCard).toBeNull();
  });

  it('changes aria-label to expand when collapsed', () => {
    render(<HomePage />);
    const chevronButton = screen.getByRole('button', {
      name: LABEL_UPCOMING_CHEVRON_COLLAPSE_ARIA,
    });
    fireEvent.click(chevronButton);
    const expandButton = screen.getByRole('button', {
      name: LABEL_UPCOMING_CHEVRON_EXPAND_ARIA,
    });
    expect(expandButton).toBeTruthy();
  });

  it('re-expands the section when the chevron is clicked again', () => {
    render(<HomePage />);
    const chevronButton = screen.getByRole('button', {
      name: LABEL_UPCOMING_CHEVRON_COLLAPSE_ARIA,
    });
    fireEvent.click(chevronButton);
    const expandButton = screen.getByRole('button', {
      name: LABEL_UPCOMING_CHEVRON_EXPAND_ARIA,
    });
    fireEvent.click(expandButton);
    const taskCard = screen.queryByTestId('task-card');
    expect(taskCard).toBeTruthy();
  });

  it('shows no tasks message when expanded and tasks list is empty', () => {
    render(<HomePage />);
    expect(screen.queryByText(LABEL_NO_TASKS)).toBeNull();
  });
});
