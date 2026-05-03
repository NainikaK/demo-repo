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
});
