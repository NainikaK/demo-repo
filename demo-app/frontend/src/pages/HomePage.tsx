import { useEffect, useState, useCallback, useMemo } from 'react';
import { TaskCard } from '../components/TaskCard';
import { AddTasksSection } from '../components/AddTasksSection';
import { LoadMoreButton } from '../components/LoadMoreButton';
import { SmileyIcon } from '../components/SmileyIcon';
import { EyeIcon } from '../components/EyeIcon';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import { PriorityFilter } from '../components/PriorityFilter';
import { CommentPanel } from '../components/CommentPanel';
import { TaskSearchBar } from '../components/TaskSearchBar';
import { TaskStatsDashboard } from '../components/TaskStatsDashboard';
import { SortButton } from '../components/SortButton';
import { useUpcomingTasks } from '../hooks/useUpcomingTasks';
import { useCompletedTasks } from '../hooks/useCompletedTasks';
import { usePriorityFilter } from '../hooks/usePriorityFilter';
import { useCompletedTasksPriorityFilter } from '../hooks/useCompletedTasksPriorityFilter';
import { useTaskSearch } from '../hooks/useTaskSearch';
import { useTaskSort } from '../hooks/useTaskSort';
import type { Task, ActiveCommentTask } from '../types';
import { COMMENTS_URL } from '../utils/constants';
import {
  LABEL_COMPLETE_ERROR,
  LABEL_ERROR_PREFIX,
  LABEL_LOADING,
  LABEL_NO_TASKS,
  LABEL_RETRY,
  LABEL_RETRY_ARIA,
  LABEL_TASKS_HEADING,
  LABEL_UPCOMING_CHEVRON_COLLAPSE_ARIA,
  LABEL_UPCOMING_CHEVRON_EXPAND_ARIA,
} from '../utils/strings';

const UPCOMING_TASKS_MAX_HEIGHT = 'max-h-[200px]';

async function fetchCommentCount(taskId: string): Promise<number> {
  try {
    const response = await fetch(COMMENTS_URL(taskId));
    if (!response.ok) return 0;
    const data: unknown[] = await response.json();
    return data.length;
  } catch {
    return 0;
  }
}

export function HomePage() {
  const {
    visibleTasks,
    allTasks,
    hasMore,
    loading,
    error,
    completeError,
    refetch,
    addTask,
    completeTask,
    loadMore,
  } = useUpcomingTasks();

  const { completedTasks } = useCompletedTasks();

  const { selectedPriority, setSelectedPriority, filterTasks } = usePriorityFilter();

  const {
    selectedPriority: completedSelectedPriority,
    setSelectedPriority: setCompletedSelectedPriority,
    filteredTasks: filteredCompletedTasks,
  } = useCompletedTasksPriorityFilter(completedTasks);

  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [activeCommentTask, setActiveCommentTask] =
    useState<ActiveCommentTask | null>(null);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState<boolean>(true);

  const priorityFilteredTasks = filterTasks(visibleTasks);

  const {
    searchTerm,
    setSearchTerm,
    filteredTasks,
  } = useTaskSearch(priorityFilteredTasks);

  const { sortDirection, toggleSortDirection, sortedTasks } = useTaskSort(filteredTasks);

  const allStatTasks = useMemo(() => allTasks, [allTasks]);

  useEffect(() => {
    if (visibleTasks.length === 0) return;
    const loadCounts = async () => {
      const entries = await Promise.all(
        visibleTasks.map(async (task) => {
          const count = await fetchCommentCount(task.id);
          return [task.id, count] as [string, number];
        })
      );
      setCommentCounts((prev) => {
        const next = { ...prev };
        for (const [id, count] of entries) {
          next[id] = count;
        }
        return next;
      });
    };
    loadCounts();
  }, [visibleTasks]);

  const handleTaskCreated = useCallback((task: Task) => {
    addTask(task);
  }, [addTask]);

  const handleCommentClick = useCallback((task: Task) => {
    setActiveCommentTask({ id: task.id, title: task.title });
  }, []);

  const handlePanelClose = useCallback(() => {
    setActiveCommentTask(null);
  }, []);

  const handleCommentAdded = useCallback((taskId: string) => {
    setCommentCounts((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] ?? 0) + 1,
    }));
  }, []);

  const handleUpcomingToggle = useCallback(() => {
    setIsUpcomingExpanded((prev) => !prev);
  }, []);

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
      <TaskStatsDashboard tasks={allStatTasks} />
      <AddTasksSection onTaskCreated={handleTaskCreated} />
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {LABEL_TASKS_HEADING}
        <EyeIcon className="inline-block w-[1em] h-[1em]" />
        <SortButton sortDirection={sortDirection} onClick={toggleSortDirection} />
        <button
          aria-label={
            isUpcomingExpanded
              ? LABEL_UPCOMING_CHEVRON_COLLAPSE_ARIA
              : LABEL_UPCOMING_CHEVRON_EXPAND_ARIA
          }
          onClick={handleUpcomingToggle}
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
              isUpcomingExpanded ? 'rotate-180' : 'rotate-0'
            }`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </h2>
      <div className="flex items-center gap-3 mb-4">
        <PriorityFilter
          selectedPriority={selectedPriority}
          onChange={setSelectedPriority}
        />
        <TaskSearchBar value={searchTerm} onChange={setSearchTerm} />
      </div>
      {completeError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {LABEL_COMPLETE_ERROR}
        </p>
      )}
      {isUpcomingExpanded && (
        sortedTasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{LABEL_NO_TASKS}</p>
        ) : (
          <ul className={`flex flex-col gap-3 overflow-y-auto ${UPCOMING_TASKS_MAX_HEIGHT}`}>
            {sortedTasks.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  onComplete={completeTask}
                  commentCount={commentCounts[task.id] ?? 0}
                  onCommentClick={handleCommentClick}
                />
              </li>
            ))}
          </ul>
        )
      )}
      <LoadMoreButton onClick={loadMore} visible={hasMore} />
      <div className="mt-8">
        <CompletedTasksSection
          completedTasks={filteredCompletedTasks}
          onComplete={completeTask}
          selectedPriority={completedSelectedPriority}
          onPriorityChange={setCompletedSelectedPriority}
        />
      </div>
      <div className="flex justify-center mt-6">
        <SmileyIcon />
      </div>
      <CommentPanel
        activeTask={activeCommentTask}
        onClose={handlePanelClose}
        onCommentAdded={handleCommentAdded}
      />
    </main>
  );
}
