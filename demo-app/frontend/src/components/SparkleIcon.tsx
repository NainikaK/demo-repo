import React from 'react';

export interface SparkleIconProps {
  className?: string;
}

export function SparkleIcon({ className }: SparkleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
      <path d="M5 0l.93 2.79L8 3.75l-2.07.96L5 7.5l-.93-2.79L2 3.75l2.07-.96L5 0z" />
      <path d="M19 16l.93 2.79L22 19.75l-2.07.96L19 23.5l-.93-2.79L16 19.75l2.07-.96L19 16z" />
    </svg>
  );
}
