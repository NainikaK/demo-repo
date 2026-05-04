import type { CSSProperties } from 'react';

export interface ChevronIconProps {
  isExpanded: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const CHEVRON_DOWN_PATH = 'M19 9l-7 7-7-7';
const CHEVRON_RIGHT_PATH = 'M9 5l7 7-7 7';

export function ChevronIcon({ isExpanded, className = '', style, ariaLabel }: ChevronIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel === undefined ? true : undefined}
      role={ariaLabel !== undefined ? 'img' : undefined}
    >
      <path d={isExpanded ? CHEVRON_DOWN_PATH : CHEVRON_RIGHT_PATH} />
    </svg>
  );
}
