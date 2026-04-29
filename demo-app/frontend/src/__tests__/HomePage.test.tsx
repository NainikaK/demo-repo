import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '../pages/HomePage';
import * as useCreateTaskModule from '../hooks/useCreateTask';

const mockTasks = [
  {
    id: '1',
    title: 'Set up project',
    description: 'Initialise the repository',
    completed: true,
    createdAt: '2024-01-10T09:00:00.000Z',
  },
];

const newTask = {
  id: '4',
  title: 'A brand new task',
  description: '',
  completed: false,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTasks,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('HomePage_Render_ShowsTaskFormAndTaskList', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeTruthy();
    });

    expect(screen.getByText('Upcoming Tasks')).toBeTruthy();
  });

  it('Scenario_NewTaskAppearsImmediately_TaskVisibleWithoutReload', async () => {
    vi.spyOn(useCreateTaskModule, 'createTask').mockResolvedValueOnce(newTask);
    const user = userEvent.setup();

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeTruthy();
    });

    await user.type(screen.getByLabelText(/title/i), 'A brand new task');
    await user.click(screen.getByRole('button', { name: /add new task/i }));

    await waitFor(() => {
      expect(screen.getByText('A brand new task')).toBeTruthy();
    });
  });

  it('HomePage_FetchError_ShowsRetryButton', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry loading tasks/i })).toBeTruthy();
    });
  });
});
