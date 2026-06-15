import { useState, useMemo } from 'react';
import type { Task } from '../types';

export interface UseCompletedTasksSearchResult {
  completedSearchTerm: string;
  setCompletedSearchTerm: (term: string) => void;
  filteredCompletedTasks: Task[];
}

export function useCompletedTasksSearch(tasks: Task[]): UseCompletedTasksSearchResult {
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');

  const filteredCompletedTasks = useMemo(() => {
    if (completedSearchTerm.trim() === '') {
      return tasks;
    }
    const lowerTerm = completedSearchTerm.toLowerCase();
    return tasks.filter((task) => task.title.toLowerCase().includes(lowerTerm));
  }, [tasks, completedSearchTerm]);

  return { completedSearchTerm, setCompletedSearchTerm, filteredCompletedTasks };
}
