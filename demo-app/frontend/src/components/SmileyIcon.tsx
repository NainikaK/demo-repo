
interface SmileyIconProps {
  size?: number;
  color?: string;
}

const SMILEY_SIZE = 15;
const SMILEY_COLOR = '#FACC15';
const SMILEY_ARIA_LABEL = 'Smiley face icon';

export function SmileyIcon({ size = SMILEY_SIZE, color = SMILEY_COLOR }: SmileyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={SMILEY_ARIA_LABEL}
      role="img"
    >
      <circle cx="12" cy="12" r="11" fill={color} />
      <circle cx="8.5" cy="10" r="1.5" fill="#000" />
      <circle cx="15.5" cy="10" r="1.5" fill="#000" />
      <path
        d="M7.5 15.5 Q12 19.5 16.5 15.5"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
