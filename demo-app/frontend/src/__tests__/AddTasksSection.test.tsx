import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddTasksSection } from '../components/AddTasksSection';
import type { Task } from '../types';

const mocks = vi.hoisted(() => ({
  triggerToast: vi.fn(),
  visible: false,
  fading: false,
}));

vi.mock('../hooks/useTaskAddedToast', () => ({
  useTaskAddedToast: () => ({
    visible: mocks.visible,
    fading: mocks.fading,
    triggerToast: mocks.triggerToast,
  }),
}));

vi.mock('../components/TaskForm', () => ({
  TaskForm: ({ onTaskCreated }: { onTaskCreated: (task: Task) => void }) => (
    <button
      data-testid="task-form-submit"
      onClick={() =>
        onTaskCreated({
          id: 'new-task',
          title: 'New Task',
          completed: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          priority: 'medium',
        })
      }
    >
      Submit Task
    </button>
  ),
}));

vi.mock('../components/TaskAddedToast', () => ({
  TaskAddedToast: ({ visible }: { visible: boolean; fading: boolean }) =>
    visible ? <div data-testid="task-added-toast" /> : null,
}));

describe('AddTasksSection', () => {
  beforeEach(() => {
    mocks.triggerToast.mockClear();
    mocks.visible = false;
    mocks.fading = false;
  });

  it('render test - renders the section heading and the task form by default', () => {
    render(<AddTasksSection onTaskCreated={vi.fn()} />);

    expect(screen.getByText('Add tasks')).toBeInTheDocument();
    expect(screen.getByTestId('task-form-submit')).toBeInTheDocument();
  });

  it('interaction test - clicking the chevron button collapses and hides the task form', async () => {
    render(<AddTasksSection onTaskCreated={vi.fn()} />);

    expect(screen.getByTestId('task-form-submit')).toBeInTheDocument();

    const collapseButton = screen.getByRole('button', {
      name: 'Collapse add tasks section',
    });
    await userEvent.click(collapseButton);

    expect(screen.queryByTestId('task-form-submit')).not.toBeInTheDocument();
  });

  it('edge case - calls onTaskCreated and triggerToast when the task form reports a new task', async () => {
    const onTaskCreated = vi.fn();
    render(<AddTasksSection onTaskCreated={onTaskCreated} />);

    await userEvent.click(screen.getByTestId('task-form-submit'));

    await waitFor(() => {
      expect(onTaskCreated).toHaveBeenCalledTimes(1);
      expect(mocks.triggerToast).toHaveBeenCalledTimes(1);
    });
  });
});
