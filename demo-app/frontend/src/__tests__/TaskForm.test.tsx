import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TaskForm } from '../components/TaskForm';

vi.mock('../hooks/useAssignableUsers', () => ({
  useAssignableUsers: () => ({ users: [], loading: false, error: null }),
}));

vi.mock('../hooks/useCreateTask', () => ({
  createTask: vi.fn(),
}));

import * as createTaskModule from '../hooks/useCreateTask';

const TITLE_MAX_LENGTH = 100;
const TITLE_WARN_LENGTH = 80;

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the form with a priority select defaulting to medium', () => {
    render(<TaskForm onTaskCreated={vi.fn()} />);

    const prioritySelect = screen.getByRole('combobox', { name: 'Priority' });
    expect(prioritySelect).toBeInTheDocument();
    expect((prioritySelect as HTMLSelectElement).value).toBe('medium');
  });

  it('interaction test - allows changing the priority to high and submits with that priority', async () => {
    const createdTask = {
      id: '10',
      title: 'New Task',
      completed: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      priority: 'high' as const,
    };
    vi.spyOn(createTaskModule, 'createTask').mockResolvedValueOnce(createdTask);
    const onTaskCreated = vi.fn();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await userEvent.type(screen.getByLabelText(/Title/i), 'New Task');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'high');
    await userEvent.click(screen.getByRole('button', { name: 'Add new task' }));

    await waitFor(() => {
      expect(createTaskModule.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' }),
      );
    });
  });

  it('edge case - shows a validation error when submitted with an empty title', async () => {
    render(<TaskForm onTaskCreated={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add new task' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('character counter - displays 0/100 when title is empty', () => {
    render(<TaskForm onTaskCreated={vi.fn()} />);

    expect(screen.getByText(`0/${TITLE_MAX_LENGTH}`)).toBeInTheDocument();
  });

  it('character counter - updates count on every keystroke', async () => {
    render(<TaskForm onTaskCreated={vi.fn()} />);

    const titleInput = screen.getByLabelText(/Title/i);
    await userEvent.type(titleInput, 'Hello');

    expect(screen.getByText(`5/${TITLE_MAX_LENGTH}`)).toBeInTheDocument();
  });

  it('character counter - text is not red when count is 80 or below', async () => {
    render(<TaskForm onTaskCreated={vi.fn()} />);

    const titleInput = screen.getByLabelText(/Title/i);
    const eightyChars = 'a'.repeat(TITLE_WARN_LENGTH);
    await userEvent.type(titleInput, eightyChars);

    const counter = screen.getByText(`${TITLE_WARN_LENGTH}/${TITLE_MAX_LENGTH}`);
    expect(counter).not.toHaveClass('text-red-600');
  });

  it('character counter - text turns red when count exceeds 80 characters', async () => {
    render(<TaskForm onTaskCreated={vi.fn()} />);

    const titleInput = screen.getByLabelText(/Title/i);
    const eightyOneChars = 'a'.repeat(TITLE_WARN_LENGTH + 1);
    await userEvent.type(titleInput, eightyOneChars);

    const counter = screen.getByText(`${TITLE_WARN_LENGTH + 1}/${TITLE_MAX_LENGTH}`);
    expect(counter).toHaveClass('text-red-600');
  });
});
