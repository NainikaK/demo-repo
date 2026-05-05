import { AssigneeAvatar } from './AssigneeAvatar';
import { PriorityIcon } from './PriorityIcon';
import { DueDateBadge } from './DueDateBadge';
import { CommentButton } from './CommentButton';
import type { Task } from '../types';
import {
  LABEL_COMPLETED,
  LABEL_MARK_COMPLETE,
  LABEL_MARK_COMPLETE_ARIA,
  LABEL_CHECK_TICK_ICON_ARIA,
} from '../utils/strings';

interface TaskCardProps {
  task: Task;
  onComplete?: (id: string) => Promise<void>;
  commentCount?: number;
  onCommentClick?: (task: Task) => void;
}

export function TaskCard({
  task,
  onComplete,
  commentCount = 0,
  onCommentClick,
}: TaskCardProps) {
  const handleComplete = async () => {
    if (task.completed || !onComplete) return;
    await onComplete(task.id);
  };

  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick(task);
    }
  };

  return (
    <div
      className={
        task.completed
          ? 'bg-green-50 dark:bg-green-950 rounded-lg shadow-sm p-4 border border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700'
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityIcon priority={task.priority} />
          <h2
            className={
              task.completed
                ? 'text-base font-medium text-gray-400 dark:text-gray-500 line-through'
                : 'text-base font-medium text-gray-900 dark:text-white'
            }
          >
            {task.title}
          </h2>
          {task.completed && (
            <svg
              aria-label={LABEL_CHECK_TICK_ICON_ARIA}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[1em] h-[1em] text-gray-400 dark:text-gray-500 pointer-events-none shrink-0"
              aria-hidden={false}
              focusable="false"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.assignedTo && <AssigneeAvatar name={task.assignedTo} />}
          {!task.completed && <DueDateBadge dueDate={task.dueDate} />}
          {task.completed ? (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {LABEL_COMPLETED}
            </span>
          ) : (
            onComplete && (
              <button
                aria-label={`${LABEL_MARK_COMPLETE_ARIA}: ${task.title}`}
                onClick={handleComplete}
                className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {LABEL_MARK_COMPLETE}
              </button>
            )
          )}
          {onCommentClick && (
            <CommentButton
              commentCount={commentCount}
              onClick={handleCommentClick}
            />
          )}
        </div>
      </div>
      {task.description && (
        <p
          className={
            task.completed
              ? 'mt-1 text-sm text-gray-400 dark:text-gray-500 line-through'
              : 'mt-1 text-sm text-gray-600 dark:text-gray-400'
          }
        >
          {task.description}
        </p>
      )}
      <time
        className="mt-2 block text-xs text-gray-400 dark:text-gray-500"
        dateTime={task.createdAt}
      >
        {new Date(task.createdAt).toLocaleDateString()}
      </time>
    </div>
  );
}
