import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import {
  LABEL_COMPLETED_SEARCH_ARIA,
  LABEL_NO_COMPLETED_TASKS_SEARCH,
} from '../utils/strings';

const makeTasks = (titles: string[]): Task[] =>
  titles.map((title, index) => ({
    id: String(index),
    title,
    completed: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    priority: 'low' as const,
  }));

const defaultProps = {
  onComplete: jest.fn(),
  selectedPriority: null,
  onPriorityChange: jest.fn(),
};

describe('CompletedTasksSection search bar', () => {
  it('renders a search bar below the priority filter', () => {
    render(
      <CompletedTasksSection
        {...defaultProps}
        completedTasks={makeTasks(['Team Meeting'])}
      />,
    );
    expect(screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA })).toBeInTheDocument();
  });

  it('filters tasks by title in real time as the user types', async () => {
    const user = userEvent.setup();
    render(
      <CompletedTasksSection
        {...defaultProps}
        completedTasks={makeTasks(['Team Meeting', 'Code Review', 'Deploy App'])}
      />,
    );
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await user.type(searchInput, 'meeting');
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.queryByText('Code Review')).not.toBeInTheDocument();
    expect(screen.queryByText('Deploy App')).not.toBeInTheDocument();
  });

  it('performs case-insensitive title filtering', async () => {
    const user = userEvent.setup();
    render(
      <CompletedTasksSection
        {...defaultProps}
        completedTasks={makeTasks(['Team Meeting', 'Code Review'])}
      />,
    );
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await user.type(searchInput, 'TEAM');
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.queryByText('Code Review')).not.toBeInTheDocument();
  });

  it('restores the full list when the search bar is cleared', async () => {
    const user = userEvent.setup();
    render(
      <CompletedTasksSection
        {...defaultProps}
        completedTasks={makeTasks(['Team Meeting', 'Code Review'])}
      />,
    );
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await user.type(searchInput, 'meeting');
    expect(screen.queryByText('Code Review')).not.toBeInTheDocument();
    await user.clear(searchInput);
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Code Review')).toBeInTheDocument();
  });

  it('shows empty search message when no tasks match the search term', async () => {
    const user = userEvent.setup();
    render(
      <CompletedTasksSection
        {...defaultProps}
        completedTasks={makeTasks(['Team Meeting'])}
      />,
    );
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await user.type(searchInput, 'xyz');
    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS_SEARCH)).toBeInTheDocument();
  });

  it('does not filter tasks by fields other than title', async () => {
    const user = userEvent.setup();
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Alpha Task',
        description: 'contains meeting keyword',
        completed: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        priority: 'high',
        assignedTo: 'meeting-person',
      },
    ];
    render(
      <CompletedTasksSection
        {...defaultProps}
        completedTasks={tasks}
      />,
    );
    const searchInput = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await user.type(searchInput, 'meeting');
    expect(screen.queryByText('Alpha Task')).not.toBeInTheDocument();
    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS_SEARCH)).toBeInTheDocument();
  });
});
