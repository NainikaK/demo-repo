import { useState, useMemo } from 'react';
import type { Task } from '../types';

export interface UseTaskSearchResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredTasks: Task[];
}

export function useTaskSearch(tasks: Task[]): UseTaskSearchResult {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = useMemo(() => {
    if (searchTerm === '') return tasks;
    const lowerTerm = searchTerm.toLowerCase();
    return tasks.filter((task) =>
      task.title.toLowerCase().includes(lowerTerm)
    );
  }, [tasks, searchTerm]);

  return { searchTerm, setSearchTerm, filteredTasks };
}
