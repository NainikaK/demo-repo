import { useMemo } from 'react';
import type { Task } from '../types';

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isTaskOverdue(task: Task, today: string): boolean {
  if (!task.dueDate) return false;
  if (task.completed) return false;
  return task.dueDate < today;
}

export function useTaskStats(tasks: Task[]): TaskStats {
  return useMemo(() => {
    const today = getTodayDateString();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = tasks.filter((t) => !t.completed).length;
    const overdue = tasks.filter((t) => isTaskOverdue(t, today)).length;
    return { total, completed, pending, overdue };
  }, [tasks]);
}
