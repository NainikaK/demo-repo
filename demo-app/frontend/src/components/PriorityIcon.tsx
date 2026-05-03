import type { Priority } from '../types';
import {
  LABEL_PRIORITY_HIGH,
  LABEL_PRIORITY_LOW,
  LABEL_PRIORITY_MEDIUM,
  LABEL_PRIORITY_ICON_ARIA_PREFIX,
} from '../utils/strings';

export interface PriorityIconProps {
  priority: Priority;
}

const PRIORITY_LABEL_MAP: Record<Priority, string> = {
  low: LABEL_PRIORITY_LOW,
  medium: LABEL_PRIORITY_MEDIUM,
  high: LABEL_PRIORITY_HIGH,
};

const PRIORITY_COLOR_MAP: Record<Priority, string> = {
  low: 'text-blue-400',
  medium: 'text-yellow-400',
  high: 'text-red-500',
};

export function PriorityIcon({ priority }: PriorityIconProps) {
  const label = PRIORITY_LABEL_MAP[priority];
  const colorClass = PRIORITY_COLOR_MAP[priority];
  const ariaLabel = `${LABEL_PRIORITY_ICON_ARIA_PREFIX} ${label}`;

  return (
    <span
      className="relative group inline-flex items-center"
      title={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-4 h-4 ${colorClass}`}
        aria-label={ariaLabel}
        role="img"
        focusable="false"
      >
        <path
          fillRule="evenodd"
          d="M3 6a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3V6ZM3 15.75a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2.25Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3v-2.25Z"
          clipRule="evenodd"
        />
      </svg>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-gray-800 dark:bg-gray-700 px-2 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-hidden="true"
      >
        {label}
      </span>
    </span>
  );
}
