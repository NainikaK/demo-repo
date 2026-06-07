import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import {
  LABEL_COMPLETED_SEARCH_ARIA,
  LABEL_COMPLETED_SEARCH_PLACEHOLDER,
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
    title: 'Write unit tests',
    completed: true,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'high',
  },
  {
    id: '3',
    title: 'Buy birthday cake',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'medium',
  },
];

const DEFAULT_PROPS = {
  completedTasks: MOCK_COMPLETED_TASKS,
  onComplete: jest.fn(),
  selectedPriority: null,
  onPriorityChange: jest.fn(),
};

describe('CompletedTasksSection search', () => {
  it('renders a search bar with the correct placeholder', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const input = screen.getByPlaceholderText(LABEL_COMPLETED_SEARCH_PLACEHOLDER);
    expect(input).toBeInTheDocument();
  });

  it('renders a search bar with the correct aria-label', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    expect(input).toBeInTheDocument();
  });

  it('shows all completed tasks when search is empty', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    expect(screen.getByText('Buy birthday cake')).toBeInTheDocument();
  });

  it('filters tasks in real time as the user types', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(input, { target: { value: 'buy' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Buy birthday cake')).toBeInTheDocument();
    expect(screen.queryByText('Write unit tests')).not.toBeInTheDocument();
  });

  it('hides tasks whose titles do not match the search term', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(input, { target: { value: 'unit' } });
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Buy birthday cake')).not.toBeInTheDocument();
  });

  it('restores the full list when the search bar is cleared', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    fireEvent.change(input, { target: { value: 'buy' } });
    expect(screen.queryByText('Write unit tests')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    expect(screen.getByText('Buy birthday cake')).toBeInTheDocument();
  });
});
