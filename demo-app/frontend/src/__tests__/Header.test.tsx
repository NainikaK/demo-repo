import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../components/Header';
import { APP_TITLE, LABEL_DARK_MODE, LABEL_TOGGLE_TO_DARK } from '../utils/strings';

const mocks = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark',
  toggleTheme: vi.fn(),
  weather: null as null,
  loading: false,
  error: null as null,
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: mocks.theme, toggleTheme: mocks.toggleTheme }),
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: () => ({ weather: mocks.weather, loading: mocks.loading, error: mocks.error }),
}));

vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: () => <span data-testid="weather-widget" />,
}));

vi.mock('../components/PaperIcon', () => ({
  PaperIcon: ({ className }: { className?: string }) => <span data-testid="paper-icon" className={className} />,
}));

vi.mock('../components/SmileyIcon', () => ({
  SmileyIcon: ({ className }: { className?: string }) => <span data-testid="smiley-icon" className={className} />,
}));

vi.mock('../components/SparkleIcon', () => ({
  SparkleIcon: ({ className }: { className?: string }) => <span data-testid="sparkle-icon" className={className} />,
}));

vi.mock('../components/ThemeIcon', () => ({
  ThemeIcon: ({ isDark }: { isDark: boolean }) => <span data-testid="theme-icon" aria-label={isDark ? 'Dark mode icon' : 'Light mode icon'} />,
}));

describe('Header', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.theme = 'light';
  });

  it('renders the APP_TITLE text with the emerald color class applied to its span', () => {
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan.tagName).toBe('SPAN');
    expect(titleSpan).toHaveClass('text-emerald-600');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggleButton = screen.getByRole('button', { name: LABEL_TOGGLE_TO_DARK });
    await user.click(toggleButton);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders the theme toggle button with dark mode label when theme is dark and does not crash', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass('dark:text-emerald-400');
    expect(screen.getByText(LABEL_DARK_MODE)).not.toBeInTheDocument;
  });
});
