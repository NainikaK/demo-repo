import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Header } from '../components/Header';
import { APP_TITLE } from '../utils/strings';

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
  mocks.toggleTheme.mockClear();
});

describe('Header', () => {
  it('renders the app title with the theme-aware light-mode colour class', () => {
    render(<Header />);
    const titleSpan = screen.getByText((content) =>
      content.toLowerCase().includes(APP_TITLE.toLowerCase()),
    );
    expect(titleSpan).toHaveClass('text-gray-900');
  });

  it('does not render the app title with the old pink colour class', () => {
    render(<Header />);
    const titleSpan = screen.getByText((content) =>
      content.toLowerCase().includes(APP_TITLE.toLowerCase()),
    );
    expect(titleSpan).not.toHaveClass('text-pink-500');
  });

  it('renders the app title with the theme-aware dark-mode colour class when theme is dark', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText((content) =>
      content.toLowerCase().includes(APP_TITLE.toLowerCase()),
    );
    expect(titleSpan).toHaveClass('dark:text-white');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const button = screen.getByRole('button');
    await user.click(button);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing when theme is dark and does not apply white class to any button', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('text-white');
  });
});
