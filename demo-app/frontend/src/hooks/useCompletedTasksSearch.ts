import { useState, useMemo } from 'react';
import type { Task, Priority } from '../types';

export interface UseCompletedTasksSearchResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredTasks: Task[];
}

export function useCompletedTasksSearch(
  tasks: Task[],
  selectedPriority: Priority | null = null,
): UseCompletedTasksSearchResult {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (selectedPriority !== null) {
      result = result.filter((task) => task.priority === selectedPriority);
    }

    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((task) =>
        task.title.toLowerCase().includes(lowerSearch),
      );
    }

    return result;
  }, [tasks, selectedPriority, searchTerm]);

  return { searchTerm, setSearchTerm, filteredTasks };
}
