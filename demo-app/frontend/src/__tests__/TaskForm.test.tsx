import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TaskForm } from '../components/TaskForm';
import * as useAssignableUsersModule from '../hooks/useAssignableUsers';
import * as useCreateTaskModule from '../hooks/useCreateTask';
import type { Task } from '../types';

const mockUsers = ['Nainika K', 'Anna', 'Elsa', 'Sam D', 'Jacey'];

const mockTask: Task = {
  id: '10',
  title: 'Test Task',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('TaskForm', () => {
  beforeEach(() => {
    vi.spyOn(useAssignableUsersModule, 'useAssignableUsers').mockReturnValue({
      users: mockUsers,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the Assigned to dropdown with placeholder and user options', () => {
    const onTaskCreated = vi.fn();
    render(<TaskForm onTaskCreated={onTaskCreated} />);

    const select = screen.getByRole('combobox', { name: 'Assigned to' });
    expect(select).toBeInTheDocument();

    expect(screen.getByText('\u2014 Select user \u2014')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Nainika K' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Anna' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Elsa' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sam D' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Jacey' })).toBeInTheDocument();
  });

  it('interaction test - selecting a user from the dropdown updates the selected value', async () => {
    const onTaskCreated = vi.fn();
    render(<TaskForm onTaskCreated={onTaskCreated} />);

    const select = screen.getByRole('combobox', { name: 'Assigned to' });
    await userEvent.selectOptions(select, 'Anna');

    expect((screen.getByRole('option', { name: 'Anna' }) as HTMLOptionElement).selected).toBe(true);
  });

  it('edge case - form can be submitted without selecting an assignee', async () => {
    const onTaskCreated = vi.fn();
    vi.spyOn(useCreateTaskModule, 'createTask').mockResolvedValueOnce(mockTask);

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    const titleInput = screen.getByRole('textbox', { name: /title/i });
    await userEvent.type(titleInput, 'New Task');

    const submitButton = screen.getByRole('button', { name: 'Add new task' });
    await userEvent.click(submitButton);

    await waitFor(() => expect(onTaskCreated).toHaveBeenCalledTimes(1));
  });
});
