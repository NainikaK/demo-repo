import type { ActivityEntry } from '../types';
import {
  LABEL_ACTIVITY_EMPTY,
  LABEL_ACTIVITY_FETCH_ERROR,
  LABEL_ACTIVITY_LOADING,
} from '../utils/strings';

export interface ActivityFeedProps {
  entries: ActivityEntry[];
  fetchLoading: boolean;
  fetchError: string | null;
}

export function ActivityFeed({
  entries,
  fetchLoading,
  fetchError,
}: ActivityFeedProps) {
  if (fetchLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {LABEL_ACTIVITY_LOADING}
      </p>
    );
  }

  if (fetchError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {LABEL_ACTIVITY_FETCH_ERROR}
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {LABEL_ACTIVITY_EMPTY}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2"
        >
          <p className="text-sm text-gray-800 dark:text-gray-200">
            {entry.eventType}
          </p>
          <time
            className="mt-1 block text-xs text-gray-400 dark:text-gray-500"
            dateTime={entry.createdAt}
          >
            {new Date(entry.createdAt).toLocaleString()}
          </time>
        </li>
      ))}
    </ul>
  );
}
