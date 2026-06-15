import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import type { Task } from '../types';
import {
  LABEL_COMPLETED_SEARCH_ARIA,
  LABEL_NO_COMPLETED_TASKS_SEARCH,
} from '../utils/strings';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Fix the bug',
    completed: true,
    createdAt: '2024-01-01T00:00:00Z',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Write unit tests',
    completed: true,
    createdAt: '2024-01-02T00:00:00Z',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Deploy to production',
    completed: true,
    createdAt: '2024-01-03T00:00:00Z',
    priority: 'low',
  },
];

const noop = () => {};

function renderSection(tasks: Task[] = MOCK_TASKS) {
  return render(
    <CompletedTasksSection
      completedTasks={tasks}
      onComplete={noop}
      selectedPriority={null}
      onPriorityChange={noop}
    />,
  );
}

describe('CompletedTasksSection search bar', () => {
  it('renders the search bar', () => {
    renderSection();
    expect(screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA })).toBeInTheDocument();
  });

  it('filters tasks in real time as the user types', async () => {
    renderSection();
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await userEvent.type(input, 'bug');
    expect(screen.getByText('Fix the bug')).toBeInTheDocument();
    expect(screen.queryByText('Write unit tests')).not.toBeInTheDocument();
    expect(screen.queryByText('Deploy to production')).not.toBeInTheDocument();
  });

  it('matching is case-insensitive', async () => {
    renderSection();
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await userEvent.type(input, 'WRITE');
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    expect(screen.queryByText('Fix the bug')).not.toBeInTheDocument();
  });

  it('shows no-results message when nothing matches', async () => {
    renderSection();
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await userEvent.type(input, 'zzznomatch');
    expect(screen.getByText(LABEL_NO_COMPLETED_TASKS_SEARCH)).toBeInTheDocument();
  });

  it('restores the full list when the search bar is cleared', async () => {
    renderSection();
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await userEvent.type(input, 'bug');
    expect(screen.queryByText('Write unit tests')).not.toBeInTheDocument();
    await userEvent.clear(input);
    expect(screen.getByText('Fix the bug')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    expect(screen.getByText('Deploy to production')).toBeInTheDocument();
  });

  it('does not require form submission to filter', async () => {
    renderSection();
    const input = screen.getByRole('textbox', { name: LABEL_COMPLETED_SEARCH_ARIA });
    await userEvent.type(input, 'deploy');
    expect(screen.getByText('Deploy to production')).toBeInTheDocument();
    expect(screen.queryByText('Fix the bug')).not.toBeInTheDocument();
  });
});
