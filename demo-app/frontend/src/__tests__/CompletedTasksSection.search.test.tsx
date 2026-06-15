import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import {
  LABEL_COMPLETED_SEARCH_ARIA,
  LABEL_NO_COMPLETED_TASKS_SEARCH,
} from '../utils/strings';

const MOCK_COMPLETED_TASKS: Task[] = [
  {
    id: '1',
    title: 'Team Meeting',
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Write Report',
    completed: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Fix Bug',
    completed: true,
    createdAt: '2024-01-03T00:00:00.000Z',
    priority: 'low',
  },
];

const DEFAULT_PROPS = {
  completedTasks: MOCK_COMPLETED_TASKS,
  onComplete: jest.fn(),
  selectedPriority: null,
  onPriorityChange: jest.fn(),
};

describe('CompletedTasksSection search', () => {
  it('renders the search bar below the priority filter', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    expect(searchInput).toBeInTheDocument();
  });

  it('displays all completed tasks when search term is empty', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Write Report')).toBeInTheDocument();
    expect(screen.getByText('Fix Bug')).toBeInTheDocument();
  });

  it('filters tasks in real time as user types', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'meeting' } });
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.queryByText('Write Report')).not.toBeInTheDocument();
    expect(screen.queryByText('Fix Bug')).not.toBeInTheDocument();
  });

  it('performs case-insensitive filtering', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'REPORT' } });
    expect(screen.getByText('Write Report')).toBeInTheDocument();
    expect(screen.queryByText('Team Meeting')).not.toBeInTheDocument();
  });

  it('shows no-match message when search yields no results', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'xyz-no-match' } });
    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS_SEARCH)).toBeInTheDocument();
  });

  it('restores full list when search bar is cleared', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'meeting' } });
    expect(screen.queryByText('Write Report')).not.toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Write Report')).toBeInTheDocument();
    expect(screen.getByText('Fix Bug')).toBeInTheDocument();
  });
});
