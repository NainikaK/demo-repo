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
  mocks.toggleTheme.mockReset();
});

describe('Header', () => {
  it('renders the app title with the text-yellow-200 CSS class', () => {
    render(<Header />);
    const titleSpan = screen.getByText('Task Manager');
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass('text-yellow-200');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders correctly in dark theme without crashing and title still has text-yellow-200 class', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText('Task Manager');
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass('text-yellow-200');
  });
});
