import { useState, useEffect } from 'react';
import type { Task, Priority } from '../types';

const STORAGE_KEY = 'completedTasksPriorityFilter';
const VALID_PRIORITIES: Priority[] = ['low', 'medium', 'high'];

function readStoredPriority(): Priority | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null && (VALID_PRIORITIES as string[]).includes(stored)) {
      return stored as Priority;
    }
    return null;
  } catch {
    return null;
  }
}

export interface UseCompletedTasksPriorityFilterResult {
  selectedPriority: Priority | null;
  setSelectedPriority: (priority: Priority | null) => void;
  filteredTasks: Task[];
}

export function useCompletedTasksPriorityFilter(
  tasks: Task[]
): UseCompletedTasksPriorityFilterResult {
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(
    readStoredPriority
  );

  useEffect(() => {
    try {
      if (selectedPriority === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, selectedPriority);
      }
    } catch {
      // Storage write failure is non-fatal
    }
  }, [selectedPriority]);

  const filteredTasks =
    selectedPriority === null
      ? tasks
      : tasks.filter((task) => task.priority === selectedPriority);

  return { selectedPriority, setSelectedPriority, filteredTasks };
}
