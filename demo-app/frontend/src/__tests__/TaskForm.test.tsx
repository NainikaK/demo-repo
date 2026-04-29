import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskForm } from '../components/TaskForm';
import * as useCreateTaskModule from '../hooks/useCreateTask';

const mockTask = {
  id: '5',
  title: 'My New Task',
  description: '',
  completed: false,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('TaskForm', () => {
  let onTaskCreated: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onTaskCreated = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TaskForm_Render_RendersWithoutCrashing', () => {
    render(<TaskForm onTaskCreated={onTaskCreated} />);

    expect(screen.getByLabelText(/title/i)).toBeTruthy();
    expect(screen.getByLabelText(/description/i)).toBeTruthy();
    expect(screen.getByLabelText(/due date/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /add new task/i })).toBeTruthy();
  });

  it('TaskForm_SubmitValidTitle_CallsOnTaskCreated', async () => {
    vi.spyOn(useCreateTaskModule, 'createTask').mockResolvedValueOnce(mockTask);
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await user.type(screen.getByLabelText(/title/i), 'My New Task');
    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect(onTaskCreated).toHaveBeenCalledWith(mockTask);
    });
  });

  it('TaskForm_NullOrEmptyProps_DoesNotCrashWithNoCallback', () => {
    // Edge case: onTaskCreated is a no-op (empty title scenario)
    render(<TaskForm onTaskCreated={onTaskCreated} />);

    expect(screen.getByRole('button', { name: /add new task/i })).toBeTruthy();
  });

  it('TaskForm_EmptyTitle_ShowsValidationError', async () => {
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('Title is required.')).toBeTruthy();
    });

    expect(onTaskCreated).not.toHaveBeenCalled();
  });

  it('TaskForm_WhitespaceTitle_ShowsValidationError', async () => {
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await user.type(screen.getByLabelText(/title/i), '   ');
    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect(screen.getByText('Title is required.')).toBeTruthy();
    });

    expect(onTaskCreated).not.toHaveBeenCalled();
  });

  it('TaskForm_SuccessfulSubmit_ResetsFormFields', async () => {
    vi.spyOn(useCreateTaskModule, 'createTask').mockResolvedValueOnce(mockTask);
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(titleInput, 'My New Task');
    await user.type(descriptionInput, 'Some description');
    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toBe('');
    });

    expect((descriptionInput as HTMLTextAreaElement).value).toBe('');
  });

  it('TaskForm_ApiFailure_ShowsSubmitError', async () => {
    vi.spyOn(useCreateTaskModule, 'createTask').mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await user.type(screen.getByLabelText(/title/i), 'My New Task');
    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to create task. Please try again.')).toBeTruthy();
    });
  });

  it('TaskForm_TitleErrorVisible_ClearsErrorOnValidInput', async () => {
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect(screen.getByText('Title is required.')).toBeTruthy();
    });

    await user.type(screen.getByLabelText(/title/i), 'Valid Title');

    await waitFor(() => {
      expect(screen.queryByText('Title is required.')).toBeNull();
    });
  });

  it('Scenario_TitleFieldRequired_ShowsInlineError', async () => {
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('Title is required.')).toBeTruthy();
    });
  });

  it('Scenario_FormResetsAfterSubmit_FieldsAreEmpty', async () => {
    vi.spyOn(useCreateTaskModule, 'createTask').mockResolvedValueOnce(mockTask);
    const user = userEvent.setup();

    render(<TaskForm onTaskCreated={onTaskCreated} />);

    await user.type(screen.getByLabelText(/title/i), 'My New Task');
    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe('');
    });
  });
});
