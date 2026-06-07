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
    title: 'Go for a run',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'high',
  },
];

const NO_OP = () => undefined;

function renderSection(tasks: Task[] = MOCK_TASKS) {
  return render(
    <CompletedTasksSection
      completedTasks={tasks}
      onComplete={NO_OP}
      selectedPriority={null}
      onPriorityChange={NO_OP}
    />
  );
}

describe('CompletedTasksSection search', () => {
  it('renders the search bar in the Completed Tasks section', () => {
    renderSection();
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    expect(searchInput).toBeInTheDocument();
  });

  it('displays all completed tasks when the search bar is empty', () => {
    renderSection();
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Go for a run')).toBeInTheDocument();
  });

  it('filters tasks in real time as the user types', () => {
    renderSection();
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });

    fireEvent.change(searchInput, { target: { value: 'book' } });

    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Go for a run')).not.toBeInTheDocument();
  });

  it('performs case-insensitive filtering', () => {
    renderSection();
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });

    fireEvent.change(searchInput, { target: { value: 'BUY' } });

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
    expect(screen.queryByText('Go for a run')).not.toBeInTheDocument();
  });

  it('hides tasks that do not match the search term', () => {
    renderSection();
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });

    fireEvent.change(searchInput, { target: { value: 'xyz_no_match' } });

    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Read a book')).not.toBeInTheDocument();
    expect(screen.queryByText('Go for a run')).not.toBeInTheDocument();
  });

  it('restores the full list when the search bar is cleared', () => {
    renderSection();
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });

    fireEvent.change(searchInput, { target: { value: 'book' } });
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } });

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Go for a run')).toBeInTheDocument();
  });
});
