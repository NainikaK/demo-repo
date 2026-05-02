import { TaskCard } from '../components/TaskCard';
import { TaskForm } from '../components/TaskForm';
import { LoadMoreButton } from '../components/LoadMoreButton';
import { SmileyIcon } from '../components/SmileyIcon';
import { EyeIcon } from '../components/EyeIcon';
import { useUpcomingTasks } from '../hooks/useUpcomingTasks';
import type { Task } from '../types';
import {
  LABEL_COMPLETE_ERROR,
  LABEL_ERROR_PREFIX,
  LABEL_LOADING,
  LABEL_NO_TASKS,
  LABEL_RETRY,
  LABEL_RETRY_ARIA,
  LABEL_TASKS_HEADING,
} from '../utils/strings';

const UPCOMING_TASKS_MAX_HEIGHT = 'max-h-[200px]';

export function HomePage() {
  const {
    visibleTasks,
    hasMore,
    loading,
    error,
    completeError,
    refetch,
    addTask,
    completeTask,
    loadMore,
  } = useUpcomingTasks();

  const handleTaskCreated = (task: Task) => {
    addTask(task);
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">{LABEL_LOADING}</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-600 dark:text-red-400">
          {LABEL_ERROR_PREFIX}
          {error}
        </p>
        <button
          aria-label={LABEL_RETRY_ARIA}
          onClick={refetch}
          className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {LABEL_RETRY}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <TaskForm onTaskCreated={handleTaskCreated} />
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {LABEL_TASKS_HEADING}
        <EyeIcon className="inline-block w-[1em] h-[1em]" />
      </h2>
      {completeError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {LABEL_COMPLETE_ERROR}
        </p>
      )}
      {visibleTasks.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{LABEL_NO_TASKS}</p>
      ) : (
        <ul className={`flex flex-col gap-3 overflow-y-auto ${UPCOMING_TASKS_MAX_HEIGHT}`}>
          {visibleTasks.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} onComplete={completeTask} />
            </li>
          ))}
        </ul>
      )}
      <LoadMoreButton onClick={loadMore} visible={hasMore} />
      <div className="flex justify-center mt-6">
        <SmileyIcon />
      </div>
    </main>
  );
}
