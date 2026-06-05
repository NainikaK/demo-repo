import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import { vi } from 'vitest';

const completedTasks: Task[] = [
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
    title: 'Buy flowers',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'high',
  },
];

const defaultProps = {
  completedTasks,
  onComplete: vi.fn(),
  selectedPriority: null as null,
  onPriorityChange: vi.fn(),
};

describe('CompletedTasksSection search bar', () => {
  it('renders a search bar in the Completed Tasks section', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    expect(searchInput).toBeInTheDocument();
  });

  it('shows all completed tasks when search term is empty', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Buy flowers')).toBeInTheDocument();
  });

  it('filters tasks in real time as the user types', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    fireEvent.change(searchInput, { target: { value: 'buy' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Buy flowers')).toBeInTheDocument();
    expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
  });

  it('hides tasks whose titles do not match the search input', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    fireEvent.change(searchInput, { target: { value: 'read' } });
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Buy flowers')).not.toBeInTheDocument();
  });

  it('restores the full list when the search bar is cleared', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    fireEvent.change(searchInput, { target: { value: 'buy' } });
    expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Buy flowers')).toBeInTheDocument();
  });

  it('performs case-insensitive filtering', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    fireEvent.change(searchInput, { target: { value: 'BUY' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Buy flowers')).toBeInTheDocument();
    expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
  });
});
