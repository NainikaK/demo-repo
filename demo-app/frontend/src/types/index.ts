export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  assignedTo?: string;
  priority: Priority;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  dueDate?: string;
  assignedTo?: string;
  priority?: Priority;
}
