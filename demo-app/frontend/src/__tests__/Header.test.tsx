import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../components/Header';

const mocks = vi.hoisted(() => ({
  toggleTheme: vi.fn(),
  theme: 'light' as 'light' | 'dark',
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mocks.theme,
    toggleTheme: mocks.toggleTheme,
  }),
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
  it('render test - renders the Task Manager title without the TESTING label', () => {
    mocks.theme = 'light';
    render(<Header />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();

    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.queryByText('TESTING')).not.toBeInTheDocument();

    expect(heading).toHaveTextContent('Task Manager');
    expect(heading).not.toHaveTextContent('TESTING');
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    mocks.theme = 'light';
    mocks.toggleTheme.mockClear();
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: 'Switch to dark mode' });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders without crashing when theme is dark and shows correct button label', () => {
    mocks.theme = 'dark';
    render(<Header />);

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    expect(screen.queryByText('TESTING')).not.toBeInTheDocument();
  });
});
