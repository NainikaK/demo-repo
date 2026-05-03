import { LABEL_ASSIGNEE_AVATAR_ARIA_PREFIX } from '../utils/strings';

export interface AssigneeAvatarProps {
  name: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AssigneeAvatar({ name }: AssigneeAvatarProps) {
  const initials = getInitials(name);
  const ariaLabel = `${LABEL_ASSIGNEE_AVATAR_ARIA_PREFIX}: ${name}`;

  return (
    <div className="relative group inline-flex">
      <div
        aria-label={ariaLabel}
        title={name}
        className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-semibold select-none cursor-default"
      >
        {initials}
      </div>
      <div
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
      >
        {name}
      </div>
    </div>
  );
}
