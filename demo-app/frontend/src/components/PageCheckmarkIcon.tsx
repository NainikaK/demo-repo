import { Check } from 'lucide-react';

export interface PageCheckmarkIconProps {
  className?: string;
}

export function PageCheckmarkIcon({ className }: PageCheckmarkIconProps) {
  return (
    <Check
      aria-hidden="true"
      focusable={false}
      className={`pointer-events-none cursor-default ${className ?? ''}`}
    />
  );
}
