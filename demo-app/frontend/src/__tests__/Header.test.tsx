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
  it('render test - renders the APP_TITLE text inside a span with indigo color classes', () => {
    mocks.theme = 'light';
    render(<Header />);

    const titleSpan = screen.getByText('Task Manager');
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan.tagName.toLowerCase()).toBe('span');
    expect(titleSpan).toHaveClass('text-indigo-600');
    expect(titleSpan).toHaveClass('dark:text-indigo-400');
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    mocks.theme = 'light';
    mocks.toggleTheme.mockClear();
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: 'Toggle to dark mode' });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - only the APP_TITLE span carries the indigo color classes and no other text elements do', () => {
    mocks.theme = 'light';
    render(<Header />);

    const titleSpan = screen.getByText('Task Manager');
    expect(titleSpan).toHaveClass('text-indigo-600');

    const toggleButton = screen.getByRole('button', { name: 'Toggle to dark mode' });
    expect(toggleButton).not.toHaveClass('text-indigo-600');
    expect(toggleButton).not.toHaveClass('dark:text-indigo-400');
  });
});
