import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Buy groceries',
    completed: true,
    createdAt: '2024-01-01T00:00:00Z',
    priority: 'low',
  },
  {
    id: '2',
    title: 'Read a book',
    completed: true,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Buy a new laptop',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'high',
  },
];

const DEFAULT_PROPS = {
  completedTasks: MOCK_TASKS,
  onComplete: vi.fn(),
  selectedPriority: null,
  onPriorityChange: vi.fn(),
};

describe('CompletedTasksSection search', () => {
  it('renders a search bar in the Completed Tasks section', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    expect(
      screen.getByRole('textbox', { name: 'Search completed tasks by title' })
    ).toBeInTheDocument();
  });

  it('shows all tasks when search bar is empty', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Buy a new laptop')).toBeInTheDocument();
  });

  it('filters tasks in real time as the user types', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: 'Search completed tasks by title' });
    fireEvent.change(searchInput, { target: { value: 'buy' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Buy a new laptop')).toBeInTheDocument();
    expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
  });

  it('hides tasks whose titles do not match the search input', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: 'Search completed tasks by title' });
    fireEvent.change(searchInput, { target: { value: 'laptop' } });
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
    expect(screen.getByText('Buy a new laptop')).toBeInTheDocument();
  });

  it('restores the full list when the search bar is cleared', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: 'Search completed tasks by title' });
    fireEvent.change(searchInput, { target: { value: 'laptop' } });
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Buy a new laptop')).toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    render(<CompletedTasksSection {...DEFAULT_PROPS} />);
    const searchInput = screen.getByRole('textbox', { name: 'Search completed tasks by title' });
    fireEvent.change(searchInput, { target: { value: 'READ' } });
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Buy a new laptop')).not.toBeInTheDocument();
  });
});
