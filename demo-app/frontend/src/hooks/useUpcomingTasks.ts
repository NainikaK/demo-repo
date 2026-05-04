import { useState, useMemo } from 'react';
import { useTasks } from './useTasks';
import type { Task } from '../types';

const INITIAL_VISIBLE_COUNT = 4;
const LOAD_MORE_INCREMENT = 4;

export interface UseUpcomingTasksResult {
  visibleTasks: Task[];
  allTasks: Task[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  completeError: string | null;
  refetch: () => void;
  addTask: (task: Task) => void;
  completeTask: (id: string) => Promise<void>;
  loadMore: () => void;
}

export function useUpcomingTasks(): UseUpcomingTasksResult {
  const { tasks, loading, error, completeError, refetch, addTask, completeTask } = useTasks();
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COUNT);

  const upcomingTasks = useMemo<Task[]>(() => {
    return tasks
      .filter((task) => !task.completed)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [tasks]);

  const visibleTasks = useMemo<Task[]>(() => {
    return upcomingTasks.slice(0, visibleCount);
  }, [upcomingTasks, visibleCount]);

  const hasMore = visibleCount < upcomingTasks.length;

  const loadMore = () => {
    setVisibleCount((prev) => prev + LOAD_MORE_INCREMENT);
  };

  return {
    visibleTasks,
    allTasks: tasks,
    hasMore,
    loading,
    error,
    completeError,
    refetch,
    addTask,
    completeTask,
    loadMore,
  };
}
