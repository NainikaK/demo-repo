import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../components/Header';
import { vi } from 'vitest';
import {
  LABEL_DARK_MODE,
  LABEL_LIGHT_MODE,
  LABEL_TOGGLE_TO_DARK,
  LABEL_TOGGLE_TO_LIGHT,
  APP_TITLE,
} from '../utils/strings';

const mocks = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark',
  toggleTheme: vi.fn(),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: mocks.theme, toggleTheme: mocks.toggleTheme }),
}));

vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: () => <span data-testid="weather-widget" />,
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

describe('Header', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.theme = 'light';
  });

  it('renders without crashing and displays the app title with bg-slate-700 class', () => {
    render(<Header />);
    expect(screen.getByText(APP_TITLE)).toBeInTheDocument();
    const headerEl = screen.getByRole('banner');
    expect(headerEl).toHaveClass('bg-slate-700');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const button = screen.getByRole('button', { name: LABEL_TOGGLE_TO_DARK });
    await user.click(button);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders correctly in dark mode showing light mode button label', () => {
    mocks.theme = 'dark';
    render(<Header />);
    expect(screen.getByRole('button', { name: LABEL_TOGGLE_TO_LIGHT })).toBeInTheDocument();
    expect(screen.getByText(LABEL_LIGHT_MODE)).toBeInTheDocument();
  });
});
