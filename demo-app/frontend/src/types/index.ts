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

export interface Comment {
  id: string;
  taskId: string;
  text: string;
  createdAt: string;
}

export interface ActiveCommentTask {
  id: string;
  title: string;
}

export interface ActivityEntry {
  id: string;
  taskId: string;
  eventType: string;
  createdAt: string;
}
