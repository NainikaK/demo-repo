import { useState, useMemo } from 'react';
import type { Task } from '../types';

export interface UseCompletedTasksSearchResult {
  completedSearchTerm: string;
  setCompletedSearchTerm: (term: string) => void;
  filteredCompletedTasks: Task[];
}

export function useCompletedTasksSearch(tasks: Task[]): UseCompletedTasksSearchResult {
  const [completedSearchTerm, setCompletedSearchTerm] = useState<string>('');

  const filteredCompletedTasks = useMemo(() => {
    const trimmed = completedSearchTerm.trim().toLowerCase();
    if (trimmed === '') {
      return tasks;
    }
    return tasks.filter((task) => task.title.toLowerCase().includes(trimmed));
  }, [tasks, completedSearchTerm]);

  return {
    completedSearchTerm,
    setCompletedSearchTerm,
    filteredCompletedTasks,
  };
}
