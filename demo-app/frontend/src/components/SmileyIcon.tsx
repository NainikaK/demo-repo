const SMILEY_EMOJI = '\uD83D\uDE42';
const SMILEY_ARIA_HIDDEN = 'true';

export interface SmileyIconProps {
  className?: string;
}

export function SmileyIcon({ className }: SmileyIconProps) {
  return (
    <span
      aria-hidden={SMILEY_ARIA_HIDDEN}
      role="img"
      className={className}
    >
      {SMILEY_EMOJI}
    </span>
  );
}
