import { useState, useMemo } from 'react';
import type { Task } from '../types';

export interface UseCompletedTasksSearchResult {
  completedSearchTerm: string;
  setCompletedSearchTerm: (term: string) => void;
  filteredCompletedTasks: Task[];
}

export function useCompletedTasksSearch(completedTasks: Task[]): UseCompletedTasksSearchResult {
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');

  const filteredCompletedTasks = useMemo(() => {
    const trimmed = completedSearchTerm.trim().toLowerCase();
    if (!trimmed) {
      return completedTasks;
    }
    return completedTasks.filter((task) =>
      task.title.toLowerCase().includes(trimmed)
    );
  }, [completedTasks, completedSearchTerm]);

  return { completedSearchTerm, setCompletedSearchTerm, filteredCompletedTasks };
}
