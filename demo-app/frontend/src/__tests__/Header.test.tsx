import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../components/Header';
import { APP_TITLE, LABEL_DARK_MODE, LABEL_LIGHT_MODE } from '../utils/strings';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark',
  toggleTheme: vi.fn(),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: mocks.theme, toggleTheme: mocks.toggleTheme }),
}));

vi.mock('../components/PaperIcon', () => ({
  PaperIcon: () => <span data-testid="paper-icon" />,
}));

vi.mock('../components/SmileyIcon', () => ({
  SmileyIcon: () => <span data-testid="smiley-icon" />,
}));

vi.mock('../components/SparkleIcon', () => ({
  SparkleIcon: () => <span data-testid="sparkle-icon" />,
}));

vi.mock('../components/ThemeIcon', () => ({
  ThemeIcon: () => <span data-testid="theme-icon" />,
}));

vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: () => <span data-testid="weather-widget" />,
}));

describe('Header', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.theme = 'light';
    mocks.toggleTheme.mockClear();
  });

  it('renders the app title with the yellow color class', () => {
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan.className).toContain('text-yellow-400');
  });

  it('calls toggleTheme when the theme button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const button = screen.getByText(LABEL_DARK_MODE);
    await user.click(button);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders the title span with the yellow color class in dark theme', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan.className).toContain('text-yellow-400');
    expect(screen.getByText(LABEL_LIGHT_MODE)).toBeInTheDocument();
  });
});
