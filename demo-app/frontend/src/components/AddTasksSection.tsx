import { useCallback, useState } from 'react';
import { TaskForm } from './TaskForm';
import { TaskAddedToast } from './TaskAddedToast';
import { useTaskAddedToast } from '../hooks/useTaskAddedToast';
import type { Task } from '../types';
import {
  LABEL_ADD_TASKS_SECTION_HEADING,
  LABEL_ADD_TASKS_CHEVRON_COLLAPSE_ARIA,
  LABEL_ADD_TASKS_CHEVRON_EXPAND_ARIA,
} from '../utils/strings';

interface AddTasksSectionProps {
  onTaskCreated: (task: Task) => void;
}

export function AddTasksSection({ onTaskCreated }: AddTasksSectionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const { visible, fading, triggerToast } = useTaskAddedToast();

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleTaskCreated = useCallback(
    (task: Task) => {
      onTaskCreated(task);
      triggerToast();
    },
    [onTaskCreated, triggerToast],
  );

  return (
    <section className="mb-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        <span>{LABEL_ADD_TASKS_SECTION_HEADING}</span>
        <button
          aria-label={
            isExpanded
              ? LABEL_ADD_TASKS_CHEVRON_COLLAPSE_ARIA
              : LABEL_ADD_TASKS_CHEVRON_EXPAND_ARIA
          }
          onClick={handleToggle}
          className="inline-flex items-center justify-center leading-none text-gray-800 dark:text-gray-200 bg-transparent border-0 p-0 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-[1em] h-[1em] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </h2>
      <div className="relative">
        <TaskAddedToast visible={visible} fading={fading} />
        {isExpanded && <TaskForm onTaskCreated={handleTaskCreated} />}
      </div>
    </section>
  );
}
