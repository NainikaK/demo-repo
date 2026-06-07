import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';

const makeTask = (id: string, title: string): Task => ({
  id,
  title,
  completed: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  priority: 'low',
});

const TASKS: Task[] = [
  makeTask('1', 'Buy groceries'),
  makeTask('2', 'Fix bug in login'),
  makeTask('3', 'Write tests'),
];

const noop = () => undefined;

describe('CompletedTasksSection search bar', () => {
  it('renders the search bar', () => {
    render(
      <CompletedTasksSection
        completedTasks={TASKS}
        onComplete={noop}
        selectedPriority={null}
        onPriorityChange={noop}
      />
    );
    expect(
      screen.getByRole('textbox', { name: /search completed tasks by title/i })
    ).toBeInTheDocument();
  });

  it('filters tasks in real time as user types', () => {
    render(
      <CompletedTasksSection
        completedTasks={TASKS}
        onComplete={noop}
        selectedPriority={null}
        onPriorityChange={noop}
      />
    );
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    fireEvent.change(searchInput, { target: { value: 'bug' } });
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument();
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Write tests')).not.toBeInTheDocument();
  });

  it('restores full list when search is cleared', () => {
    render(
      <CompletedTasksSection
        completedTasks={TASKS}
        onComplete={noop}
        selectedPriority={null}
        onPriorityChange={noop}
      />
    );
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    fireEvent.change(searchInput, { target: { value: 'bug' } });
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('shows no tasks message when no completed tasks match the search', () => {
    render(
      <CompletedTasksSection
        completedTasks={TASKS}
        onComplete={noop}
        selectedPriority={null}
        onPriorityChange={noop}
      />
    );
    const searchInput = screen.getByRole('textbox', { name: /search completed tasks by title/i });
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } });
    expect(screen.getByText('No completed tasks yet')).toBeInTheDocument();
  });
});
