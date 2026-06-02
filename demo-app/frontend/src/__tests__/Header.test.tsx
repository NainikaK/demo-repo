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
  it('renders the app title with the orange colour class', () => {
    render(<Header />);
    const titleSpan = screen.getByText('task manager');
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass('text-orange-500');
  });

  it('does not apply the orange colour class to any other header element', () => {
    render(<Header />);
    const titleSpan = screen.getByText('task manager');
    const orangeElements = document
      .querySelectorAll('.text-orange-500');
    expect(orangeElements).toHaveLength(1);
    expect(orangeElements[0]).toBe(titleSpan);
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const button = screen.getByRole('button', { name: /toggle to dark/i });
    await user.click(button);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing when theme is dark', () => {
    mocks.theme = 'dark';
    render(<Header />);
    expect(screen.getByText('task manager')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle to light/i })).toBeInTheDocument();
  });
});
