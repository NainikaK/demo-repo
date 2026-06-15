import { useState, useMemo } from 'react';
import type { Task } from '../types';

export interface UseCompletedTasksSearchResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredTasks: Task[];
}

export function useCompletedTasksSearch(tasks: Task[]): UseCompletedTasksSearchResult {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = useMemo(() => {
    if (searchTerm.trim() === '') {
      return tasks;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return tasks.filter((task) => task.title.toLowerCase().includes(lowerSearch));
  }, [tasks, searchTerm]);

  return { searchTerm, setSearchTerm, filteredTasks };
}
