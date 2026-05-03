import { useTheme } from '../hooks/useTheme';
import {
  APP_TITLE,
  LABEL_DARK_MODE,
  LABEL_LIGHT_MODE,
  LABEL_TOGGLE_TO_DARK,
  LABEL_TOGGLE_TO_LIGHT,
} from '../utils/strings';
import { PaperIcon } from './PaperIcon';
import { ThemeIcon } from './ThemeIcon';
import { WeatherWidget } from './WeatherWidget';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <PaperIcon className="w-[1em] h-[1em] pointer-events-none select-none" />
        {APP_TITLE}
      </h1>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-2xl leading-none">&#128512;</span>
        <WeatherWidget />
        <ThemeIcon isDark={isDark} />
        <button
          aria-label={isDark ? LABEL_TOGGLE_TO_LIGHT : LABEL_TOGGLE_TO_DARK}
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {isDark ? LABEL_LIGHT_MODE : LABEL_DARK_MODE}
        </button>
      </div>
    </header>
  );
}
