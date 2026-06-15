import { useState, useCallback } from 'react';
import type { Task } from '../types';

export interface UseCompletedTasksSearchResult {
  completedSearchTerm: string;
  setCompletedSearchTerm: (term: string) => void;
  filterBySearchTerm: (tasks: Task[]) => Task[];
}

export function useCompletedTasksSearch(): UseCompletedTasksSearchResult {
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');

  const filterBySearchTerm = useCallback(
    (tasks: Task[]): Task[] => {
      if (completedSearchTerm.trim() === '') {
        return tasks;
      }
      const lowerTerm = completedSearchTerm.toLowerCase();
      return tasks.filter((task) =>
        task.title.toLowerCase().includes(lowerTerm)
      );
    },
    [completedSearchTerm]
  );

  return { completedSearchTerm, setCompletedSearchTerm, filterBySearchTerm };
}
