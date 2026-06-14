import { useState, useCallback } from 'react';
import type { Task } from '../types';

export interface UseCompletedTaskSearchResult {
  completedSearchTerm: string;
  setCompletedSearchTerm: (term: string) => void;
  filteredCompletedTasks: Task[];
}

export function useCompletedTaskSearch(completedTasks: Task[]): UseCompletedTaskSearchResult {
  const [completedSearchTerm, setCompletedSearchTermState] = useState<string>('');

  const setCompletedSearchTerm = useCallback((term: string) => {
    setCompletedSearchTermState(term);
  }, []);

  const filteredCompletedTasks = completedSearchTerm.trim() === ''
    ? completedTasks
    : completedTasks.filter((task) =>
        task.title.toLowerCase().includes(completedSearchTerm.toLowerCase())
      );

  return {
    completedSearchTerm,
    setCompletedSearchTerm,
    filteredCompletedTasks,
  };
}
