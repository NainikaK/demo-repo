import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

const completedTasks: Task[] = [
  {
    id: '1',
    title: 'Buy groceries',
    completed: true,
    createdAt: '2024-01-01',
    priority: 'low',
  },
  {
    id: '2',
    title: 'Task alpha',
    completed: true,
    createdAt: '2024-01-02',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'TASK BETA',
    completed: true,
    createdAt: '2024-01-03',
    priority: 'high',
  },
];

const defaultProps = {
  completedTasks,
  onComplete: jest.fn(),
  selectedPriority: null,
  onPriorityChange: jest.fn(),
};

describe('CompletedTasksSection — search bar', () => {
  it('renders the search bar below the priority filter', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
  });

  it('shows all tasks when search bar is empty', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Task alpha')).toBeInTheDocument();
    expect(screen.getByText('TASK BETA')).toBeInTheDocument();
  });

  it('filters tasks by title as user types (case-insensitive)', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'task' } });
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.getByText('Task alpha')).toBeInTheDocument();
    expect(screen.getByText('TASK BETA')).toBeInTheDocument();
  });

  it('restores all tasks when search bar is cleared', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'task' } });
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Task alpha')).toBeInTheDocument();
    expect(screen.getByText('TASK BETA')).toBeInTheDocument();
  });

  it('shows no tasks and empty message when no tasks match search', () => {
    render(<CompletedTasksSection {...defaultProps} />);
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } });
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Task alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('TASK BETA')).not.toBeInTheDocument();
  });

  it('applies both priority filter and search term (AND condition)', () => {
    render(
      <CompletedTasksSection
        {...defaultProps}
        selectedPriority="medium"
      />
    );
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'task' } });
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.getByText('Task alpha')).toBeInTheDocument();
    expect(screen.queryByText('TASK BETA')).not.toBeInTheDocument();
  });
});
