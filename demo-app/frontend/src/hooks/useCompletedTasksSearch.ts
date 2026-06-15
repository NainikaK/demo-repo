import { useMemo } from 'react';
import type { Task } from '../types';

export function useCompletedTasksSearch(tasks: Task[], searchTerm: string): Task[] {
  return useMemo(() => {
    const normalised = searchTerm.trim().toLowerCase();
    if (!normalised) return tasks;
    return tasks.filter((task) => task.title.toLowerCase().includes(normalised));
  }, [tasks, searchTerm]);
}
