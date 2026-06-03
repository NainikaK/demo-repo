import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Header } from '../components/Header';

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
  mocks.toggleTheme.mockClear();
});

describe('Header', () => {
  it('renders the app title with the white colour class in light theme', () => {
    render(<Header />);
    const titleSpan = screen.getByText((content) => content.toLowerCase().includes('task manager'));
    expect(titleSpan).toHaveClass('text-white');
  });

  it('renders the app title with the white colour class in dark theme', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText((content) => content.toLowerCase().includes('task manager'));
    expect(titleSpan).toHaveClass('text-white');
  });

  it('does not apply text-pink-500 to the title', () => {
    render(<Header />);
    const titleSpan = screen.getByText((content) => content.toLowerCase().includes('task manager'));
    expect(titleSpan).not.toHaveClass('text-pink-500');
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
