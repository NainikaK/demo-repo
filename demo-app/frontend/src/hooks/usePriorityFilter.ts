import { useState, useCallback } from 'react';
import type { Priority, Task } from '../types';

export interface UsePriorityFilterResult {
  selectedPriority: Priority | null;
  setSelectedPriority: (priority: Priority | null) => void;
  filterTasks: (tasks: Task[]) => Task[];
  clearFilter: () => void;
}

export function usePriorityFilter(): UsePriorityFilterResult {
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);

  const filterTasks = useCallback(
    (tasks: Task[]): Task[] => {
      if (selectedPriority === null) return tasks;
      return tasks.filter((task) => task.priority === selectedPriority);
    },
    [selectedPriority],
  );

  const clearFilter = useCallback(() => {
    setSelectedPriority(null);
  }, []);

  return { selectedPriority, setSelectedPriority, filterTasks, clearFilter };
}
