import { LABEL_TASK_ADDED_TOAST, LABEL_TASK_ADDED_TOAST_ICON_ARIA } from '../utils/strings';

interface TaskAddedToastProps {
  visible: boolean;
  fading: boolean;
}

export function TaskAddedToast({ visible, fading }: TaskAddedToastProps) {
  if (!visible) {
    return null;
  }

  const opacityClass = fading ? 'opacity-0' : 'opacity-100';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-gray-800 border border-green-400 dark:border-green-500 text-green-700 dark:text-green-400 text-sm font-medium px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 whitespace-nowrap z-50 ${opacityClass}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0"
        aria-label={LABEL_TASK_ADDED_TOAST_ICON_ARIA}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{LABEL_TASK_ADDED_TOAST}</span>
    </div>
  );
}
