import { TaskCard } from './TaskCard';
import { PriorityFilter } from './PriorityFilter';
import type { Task, Priority } from '../types';
import {
  LABEL_COMPLETED_TASKS_HEADING,
  LABEL_NO_COMPLETED_TASKS,
  LABEL_NO_COMPLETED_TASKS_PRIORITY,
} from '../utils/strings';

export interface CompletedTasksSectionProps {
  completedTasks: Task[];
  onComplete: (taskId: string) => void;
  selectedPriority: Priority | null;
  onPriorityChange: (priority: Priority | null) => void;
}

export function CompletedTasksSection({
  completedTasks,
  onComplete,
  selectedPriority,
  onPriorityChange,
}: CompletedTasksSectionProps) {
  const isEmpty = completedTasks.length === 0;
  const showPriorityEmpty = isEmpty && selectedPriority !== null;

  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {LABEL_COMPLETED_TASKS_HEADING}
      </h2>
      <PriorityFilter
        selectedPriority={selectedPriority}
        onChange={onPriorityChange}
      />
      {isEmpty ? (
        <p className="text-gray-500 dark:text-gray-400">
          {showPriorityEmpty ? LABEL_NO_COMPLETED_TASKS_PRIORITY : LABEL_NO_COMPLETED_TASKS}
        </p>
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
