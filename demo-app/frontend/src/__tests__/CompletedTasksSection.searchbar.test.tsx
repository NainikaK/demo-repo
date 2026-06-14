import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import {
  LABEL_COMPLETED_SEARCH_ARIA,
  LABEL_COMPLETED_SEARCH_PLACEHOLDER,
  LABEL_NO_COMPLETED_TASKS_SEARCH,
} from '../utils/strings';

const MOCK_COMPLETED_TASKS: Task[] = [
  {
    id: '1',
    title: 'Buy groceries',
    completed: true,
    createdAt: '2024-01-01T00:00:00Z',
    priority: 'low',
  },
  {
    id: '2',
    title: 'Write report',
    completed: true,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Buy birthday cake',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'high',
  },
];

const DEFAULT_PROPS = {
  completedTasks: MOCK_COMPLETED_TASKS,
  onComplete: jest.fn(),
  selectedPriority: null,
  onPriorityChange: jest.fn(),
};

describe('CompletedTasksSection search bar', () => {
  it('renders the search bar with the correct aria-label', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    expect(
      screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA })
    ).toBeInTheDocument();
  });

  it('renders the search bar with the correct placeholder', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    expect(
      screen.getByPlaceholderText(LABEL_COMPLETED_SEARCH_PLACEHOLDER)
    ).toBeInTheDocument();
  });

  it('shows all completed tasks when the search bar is empty', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Write report')).toBeInTheDocument();
    expect(screen.getByText('Buy birthday cake')).toBeInTheDocument();
  });

  it('filters tasks in real time as the user types', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'buy' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Buy birthday cake')).toBeInTheDocument();
    expect(screen.queryByText('Write report')).not.toBeInTheDocument();
  });

  it('hides tasks that do not match the search input', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'report' } });
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Buy birthday cake')).not.toBeInTheDocument();
    expect(screen.getByText('Write report')).toBeInTheDocument();
  });

  it('shows empty-state message when no tasks match the search', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } });
    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS_SEARCH)).toBeInTheDocument();
  });

  it('restores the full list when the search bar is cleared', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(searchInput, { target: { value: 'buy' } });
    expect(screen.queryByText('Write report')).not.toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Write report')).toBeInTheDocument();
    expect(screen.getByText('Buy birthday cake')).toBeInTheDocument();
  });
});
