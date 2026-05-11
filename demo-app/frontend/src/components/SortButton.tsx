import type { SortDirection } from '../hooks/useTaskSort';
import { LABEL_SORT_ASCENDING_ARIA, LABEL_SORT_DESCENDING_ARIA } from '../utils/strings';

export interface SortButtonProps {
  sortDirection: SortDirection;
  onClick: () => void;
}

export function SortButton({ sortDirection, onClick }: SortButtonProps) {
  const ariaLabel =
    sortDirection === 'asc' ? LABEL_SORT_ASCENDING_ARIA : LABEL_SORT_DESCENDING_ARIA;

  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer text-gray-800 dark:text-gray-200 leading-none"
    >
      {sortDirection === 'asc' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[1em] h-[1em]"
          aria-hidden="true"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[1em] h-[1em]"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      )}
    </button>
  );
}
