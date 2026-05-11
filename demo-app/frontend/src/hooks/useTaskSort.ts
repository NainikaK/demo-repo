import { useState, useMemo, useCallback } from 'react';
import type { Task } from '../types';

export type SortDirection = 'asc' | 'desc';

export interface UseTaskSortResult {
  sortDirection: SortDirection;
  toggleSortDirection: () => void;
  sortedTasks: Task[];
}

export function useTaskSort(tasks: Task[]): UseTaskSortResult {
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aHasDate = a.dueDate != null && a.dueDate !== '';
      const bHasDate = b.dueDate != null && b.dueDate !== '';

      if (!aHasDate && !bHasDate) return 0;
      if (!aHasDate) return 1;
      if (!bHasDate) return -1;

      const aTime = new Date(a.dueDate as string).getTime();
      const bTime = new Date(b.dueDate as string).getTime();

      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    });
  }, [tasks, sortDirection]);

  return { sortDirection, toggleSortDirection, sortedTasks };
}
