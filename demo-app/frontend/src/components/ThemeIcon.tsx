
export interface ThemeIconProps {
  isDark: boolean;
}

const SUN_ICON_ARIA_LABEL = 'Light mode icon';
const MOON_ICON_ARIA_LABEL = 'Dark mode icon';

export function ThemeIcon({ isDark }: ThemeIconProps) {
  if (isDark) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-label={MOON_ICON_ARIA_LABEL}
        role="img"
        className="w-5 h-5 text-gray-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-label={SUN_ICON_ARIA_LABEL}
      role="img"
      className="w-5 h-5 text-gray-700"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71M17.66 17.66l-.71-.71M6.34 6.34l-.71-.71M12 5a7 7 0 100 14A7 7 0 0012 5z"
      />
    </svg>
  );
}
