export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  dueDate?: string;
}
