import { LABEL_DUE_TODAY, LABEL_OVERDUE } from '../utils/strings';

interface DueDateBadgeProps {
  dueDate: string | undefined;
}

function getDueDateStatus(dueDate: string | undefined): 'overdue' | 'due-today' | 'none' {
  if (!dueDate) return 'none';

  const today = new Date();
  const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dueDateString = dueDate.slice(0, 10);

  if (dueDateString === todayDateString) return 'due-today';
  if (dueDateString < todayDateString) return 'overdue';
  return 'none';
}

export function DueDateBadge({ dueDate }: DueDateBadgeProps) {
  const status = getDueDateStatus(dueDate);

  if (status === 'none') return null;

  if (status === 'due-today') {
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
        {LABEL_DUE_TODAY}
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
      {LABEL_OVERDUE}
    </span>
  );
}
