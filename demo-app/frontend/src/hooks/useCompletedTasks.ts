import { useMemo } from 'react';
import { useTasks } from './useTasks';
import type { Task } from '../types';

interface UseCompletedTasksResult {
  completedTasks: Task[];
}

function getCompletedSortKey(task: Task): number {
  const dateStr = task.completedAt ?? task.createdAt;
  return new Date(dateStr).getTime();
}

export function useCompletedTasks(): UseCompletedTasksResult {
  const { tasks } = useTasks();

  const completedTasks = useMemo(() => {
    return tasks
      .filter((task) => task.completed)
      .sort((a, b) => getCompletedSortKey(b) - getCompletedSortKey(a));
  }, [tasks]);

  return { completedTasks };
}
