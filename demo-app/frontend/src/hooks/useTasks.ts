import { useCallback, useEffect, useState } from 'react';
import type { Task } from '../types';
import { COMPLETE_TASK_URL, TASKS_URL } from '../utils/constants';
import {
  LABEL_COMPLETE_ERROR,
  LABEL_FETCH_TASKS_ERROR_PREFIX,
  LABEL_UNKNOWN_ERROR,
} from '../utils/strings';

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  completeError: string | null;
  refetch: () => void;
  addTask: (task: Task) => void;
  completeTask: (id: string) => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(TASKS_URL);
      if (!response.ok) {
        throw new Error(`${LABEL_FETCH_TASKS_ERROR_PREFIX}${response.status}`);
      }
      const data: Task[] = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : LABEL_UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev]);
  }, []);

  const completeTask = useCallback(async (id: string): Promise<void> => {
    setCompleteError(null);

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: true } : t)),
    );

    try {
      const response = await fetch(COMPLETE_TASK_URL(id), {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : LABEL_COMPLETE_ERROR,
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: false } : t)),
      );
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, completeError, refetch: fetchTasks, addTask, completeTask };
}
