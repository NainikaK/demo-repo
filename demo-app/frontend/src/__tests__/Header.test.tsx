import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Header } from '../components/Header';
import * as useThemeModule from '../hooks/useTheme';

vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: () => <span data-testid="weather-widget" />,
}));

vi.mock('../components/ThemeIcon', () => ({
  ThemeIcon: () => <span data-testid="theme-icon" />,
}));

vi.mock('../components/PaperIcon', () => ({
  PaperIcon: ({ className }: { className?: string }) => (
    <span data-testid="paper-icon" className={className} />
  ),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
      theme: 'light',
      toggleTheme: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the Task Manager title and the PaperIcon beside it', () => {
    render(<Header />);

    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.getByTestId('paper-icon')).toBeInTheDocument();
  });

  it('render test - does not render the CheckTickIcon', () => {
    render(<Header />);

    expect(screen.queryByTestId('check-tick-icon')).not.toBeInTheDocument();
  });

  it('render test - PaperIcon has correct sizing and non-interactive classes', () => {
    render(<Header />);

    const paperIcon = screen.getByTestId('paper-icon');
    expect(paperIcon).toHaveClass('w-[1em]');
    expect(paperIcon).toHaveClass('h-[1em]');
    expect(paperIcon).toHaveClass('pointer-events-none');
    expect(paperIcon).toHaveClass('select-none');
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    const toggleTheme = vi.fn();
    vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
      theme: 'light',
      toggleTheme,
    });

    render(<Header />);

    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    await userEvent.click(button);

    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders correctly in dark mode without crashing', () => {
    vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    expect(screen.getByTestId('paper-icon')).toBeInTheDocument();
  });
});
