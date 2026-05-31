import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../components/Header';

const mocks = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark',
  toggleTheme: vi.fn(),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mocks.theme,
    toggleTheme: mocks.toggleTheme,
  }),
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
  it('render test - renders both Task Manager title and Testing teams label simultaneously', () => {
    mocks.theme = 'light';
    render(<Header />);

    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.getByText('Testing teams')).toBeInTheDocument();
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    mocks.theme = 'light';
    mocks.toggleTheme.mockClear();
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: 'Switch to dark mode' });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders without crashing and shows both texts when theme is dark', () => {
    mocks.theme = 'dark';
    render(<Header />);

    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.getByText('Testing teams')).toBeInTheDocument();
  });
});
