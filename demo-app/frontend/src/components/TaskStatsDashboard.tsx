import { useTaskStats } from '../hooks/useTaskStats';
import type { Task } from '../types';
import {
  LABEL_STATS_TOTAL,
  LABEL_STATS_COMPLETED,
  LABEL_STATS_PENDING,
  LABEL_STATS_OVERDUE,
} from '../utils/strings';

interface TaskStatsDashboardProps {
  tasks: Task[];
}

interface StatTileProps {
  count: number;
  label: string;
  colorClass: string;
}

function StatTile({ count, label, colorClass }: StatTileProps) {
  return (
    <div className={`flex flex-col items-center justify-center flex-1 rounded-lg p-4 bg-white dark:bg-gray-800 shadow ${colorClass}`}>
      <span className="text-3xl font-bold">{count}</span>
      <span className="text-sm mt-1 font-medium">{label}</span>
    </div>
  );
}

export function TaskStatsDashboard({ tasks }: TaskStatsDashboardProps) {
  const { total, completed, pending, overdue } = useTaskStats(tasks);

  return (
    <div className="flex flex-row gap-4 mb-6">
      <StatTile
        count={total}
        label={LABEL_STATS_TOTAL}
        colorClass="text-gray-700 dark:text-gray-200"
      />
      <StatTile
        count={completed}
        label={LABEL_STATS_COMPLETED}
        colorClass="text-green-600 dark:text-green-400"
      />
      <StatTile
        count={pending}
        label={LABEL_STATS_PENDING}
        colorClass="text-gray-700 dark:text-gray-200"
      />
      <StatTile
        count={overdue}
        label={LABEL_STATS_OVERDUE}
        colorClass="text-red-600 dark:text-red-400"
      />
    </div>
  );
}
