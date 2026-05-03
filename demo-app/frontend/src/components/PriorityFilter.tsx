import type { Priority } from '../types';
import {
  LABEL_PRIORITY_FILTER_ALL,
  LABEL_PRIORITY_FILTER_ARIA,
  LABEL_PRIORITY_HIGH,
  LABEL_PRIORITY_LOW,
  LABEL_PRIORITY_MEDIUM,
} from '../utils/strings';

export interface PriorityFilterProps {
  selectedPriority: Priority | null;
  onChange: (priority: Priority | null) => void;
}

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: LABEL_PRIORITY_LOW },
  { value: 'medium', label: LABEL_PRIORITY_MEDIUM },
  { value: 'high', label: LABEL_PRIORITY_HIGH },
];

const ALL_VALUE = '';

export function PriorityFilter({ selectedPriority, onChange }: PriorityFilterProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange(value === ALL_VALUE ? null : (value as Priority));
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <label
        htmlFor="priority-filter"
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {LABEL_PRIORITY_FILTER_ARIA}
      </label>
      <select
        id="priority-filter"
        value={selectedPriority ?? ALL_VALUE}
        onChange={handleChange}
        aria-label={LABEL_PRIORITY_FILTER_ARIA}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <option value={ALL_VALUE}>{LABEL_PRIORITY_FILTER_ALL}</option>
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
