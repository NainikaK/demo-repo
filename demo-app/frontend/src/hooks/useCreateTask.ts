import type { CreateTaskPayload, Task } from '../types';
import { TASKS_URL } from '../utils/constants';

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const response = await fetch(TASKS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.status}`);
  }

  const task: Task = await response.json();
  return task;
}
