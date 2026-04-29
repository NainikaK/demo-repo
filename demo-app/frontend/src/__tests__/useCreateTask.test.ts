import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTask } from '../hooks/useCreateTask';
import type { CreateTaskPayload } from '../types';

const mockTask = {
  id: '10',
  title: 'Test Task',
  description: 'A test description',
  dueDate: '2025-09-01',
  completed: false,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('createTask', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createTask_ValidPayload_ReturnsCreatedTask', async () => {
    const payload: CreateTaskPayload = { title: 'Test Task', description: 'A test description', dueDate: '2025-09-01' };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTask,
    });

    const result = await createTask(payload);

    expect(result).toEqual(mockTask);
  });

  it('createTask_NonOkResponse_ThrowsError', async () => {
    const payload: CreateTaskPayload = { title: 'Test Task' };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    await expect(createTask(payload)).rejects.toThrow('Failed to create task: 400');
  });
});
