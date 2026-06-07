import { useState } from 'react';
import { TaskCard } from './TaskCard';
import { PriorityFilter } from './PriorityFilter';
import { ChevronIcon } from './ChevronIcon';
import { useCompletedTasksSearch } from '../hooks/useCompletedTasksSearch';
import type { Task, Priority } from '../types';
import {
  LABEL_COMPLETED_TASKS_HEADING,
  LABEL_NO_COMPLETED_TASKS,
  LABEL_NO_COMPLETED_TASKS_PRIORITY,
  LABEL_CHEVRON_COLLAPSE_ARIA,
  LABEL_CHEVRON_EXPAND_ARIA,
  LABEL_COMPLETED_SEARCH_PLACEHOLDER,
  LABEL_COMPLETED_SEARCH_ARIA,
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
  const [isExpanded, setIsExpanded] = useState(true);
  const { completedSearchTerm, setCompletedSearchTerm, filteredCompletedTasks } =
    useCompletedTasksSearch(completedTasks);

  const isEmpty = filteredCompletedTasks.length === 0;
  const showPriorityEmpty = completedTasks.length === 0 && selectedPriority !== null;

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompletedSearchTerm(e.target.value);
  };

  const chevronAriaLabel = isExpanded ? LABEL_CHEVRON_COLLAPSE_ARIA : LABEL_CHEVRON_EXPAND_ARIA;

  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {LABEL_COMPLETED_TASKS_HEADING}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={chevronAriaLabel}
          aria-expanded={isExpanded}
          className="flex items-center text-gray-800 dark:text-gray-200 focus:outline-none"
        >
          <ChevronIcon
            isExpanded={isExpanded}
            className="w-[1em] h-[1em]"
          />
        </button>
      </h2>
      {isExpanded && (
        <>
          <div className="mb-3">
            <input
              type="text"
              value={completedSearchTerm}
              onChange={handleSearchChange}
              placeholder={LABEL_COMPLETED_SEARCH_PLACEHOLDER}
              aria-label={LABEL_COMPLETED_SEARCH_ARIA}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
              {filteredCompletedTasks.map((task) => (
                <li key={task.id}>
                  <TaskCard task={task} onComplete={onComplete} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
