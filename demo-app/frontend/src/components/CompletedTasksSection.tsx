import { TaskCard } from './TaskCard';
import type { Task } from '../types';
import {
  LABEL_COMPLETED_TASKS_HEADING,
  LABEL_NO_COMPLETED_TASKS,
} from '../utils/strings';

export interface CompletedTasksSectionProps {
  completedTasks: Task[];
  onComplete: (taskId: string) => void;
}

export function CompletedTasksSection({
  completedTasks,
  onComplete,
}: CompletedTasksSectionProps) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {LABEL_COMPLETED_TASKS_HEADING}
      </h2>
      {completedTasks.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{LABEL_NO_COMPLETED_TASKS}</p>
      ) : (
        <ul className="flex flex-col gap-3 max-h-[200px] overflow-y-auto">
          {completedTasks.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} onComplete={onComplete} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
