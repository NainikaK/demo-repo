import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Header } from '../components/Header';
import { APP_TITLE, LABEL_DARK_MODE, LABEL_TOGGLE_TO_DARK } from '../utils/strings';

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

afterEach(() => {
  vi.unstubAllGlobals();
  mocks.theme = 'light';
  mocks.toggleTheme.mockReset();
});

describe('Header', () => {
  it('renders the app title with the orange colour class', () => {
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeDefined();
    expect(titleSpan.className).toContain('text-orange-500');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggleButton = screen.getByRole('button', { name: LABEL_TOGGLE_TO_DARK });
    await user.click(toggleButton);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders the theme toggle button without crashing when no theme interaction occurs', () => {
    render(<Header />);
    const button = screen.getByRole('button', { name: LABEL_TOGGLE_TO_DARK });
    expect(button).toBeDefined();
    expect(button.textContent).toBe(LABEL_DARK_MODE);
  });
});
