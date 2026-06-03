import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Header } from '../components/Header';

const mocks = vi.hoisted(() => ({
  toggleTheme: vi.fn(),
  theme: 'light' as string,
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
  beforeEach(() => {
    mocks.toggleTheme.mockReset();
    mocks.theme = 'light';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the header title with the text-white CSS class applied to the title span', () => {
    render(<Header />);
    const titleSpan = screen.getByText('Task Manager');
    expect(titleSpan).toHaveClass('text-white');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggleButton = screen.getByRole('button', { name: /toggle to dark/i });
    await user.click(toggleButton);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders the header title with text-white class in dark mode without crashing', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText('Task Manager');
    expect(titleSpan).toHaveClass('text-white');
  });
});
