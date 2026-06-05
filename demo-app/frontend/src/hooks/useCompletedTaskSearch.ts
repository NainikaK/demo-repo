import { useState, useMemo } from 'react';
import type { Task } from '../types';

export interface UseCompletedTaskSearchResult {
  completedSearchTerm: string;
  setCompletedSearchTerm: (term: string) => void;
  filteredCompletedTasks: Task[];
}

export function useCompletedTaskSearch(completedTasks: Task[]): UseCompletedTaskSearchResult {
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');

  const filteredCompletedTasks = useMemo(() => {
    if (completedSearchTerm.trim() === '') {
      return completedTasks;
    }
    const lowerTerm = completedSearchTerm.toLowerCase();
    return completedTasks.filter((task) =>
      task.title.toLowerCase().includes(lowerTerm)
    );
  }, [completedTasks, completedSearchTerm]);

  return {
    completedSearchTerm,
    setCompletedSearchTerm,
    filteredCompletedTasks,
  };
}
