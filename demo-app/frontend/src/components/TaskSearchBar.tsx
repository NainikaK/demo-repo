import { useId } from 'react';
import { LABEL_TASK_SEARCH_PLACEHOLDER, LABEL_TASK_SEARCH_ARIA } from '../utils/strings';

export interface TaskSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskSearchBar({ value, onChange }: TaskSearchBarProps) {
  const inputId = useId();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <input
      id={inputId}
      type="search"
      value={value}
      onChange={handleChange}
      placeholder={LABEL_TASK_SEARCH_PLACEHOLDER}
      aria-label={LABEL_TASK_SEARCH_ARIA}
      className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
