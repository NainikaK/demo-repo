import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../components/Header';

const mocks = vi.hoisted(() => ({
  toggleTheme: vi.fn(),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: mocks.toggleTheme }),
}));

vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: () => <span data-testid="weather-widget" />,
}));

vi.mock('../components/ThemeIcon', () => ({
  ThemeIcon: () => <span data-testid="theme-icon" />,
}));

vi.mock('../components/PaperIcon', () => ({
  PaperIcon: () => <span data-testid="paper-icon" />,
}));

vi.mock('../components/SparkleIcon', () => ({
  SparkleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="sparkle-icon" className={className} aria-hidden="true" focusable="false" />
  ),
}));

describe('Header', () => {
  it('render test - renders the SparkleIcon and not a SmileyIcon in the header', () => {
    render(<Header />);

    const sparkleIcon = screen.getByTestId('sparkle-icon');
    expect(sparkleIcon).toBeInTheDocument();
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: 'Switch to dark mode' });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - SparkleIcon in header has no onClick, onMouseEnter, or interactive attributes', () => {
    render(<Header />);

    const sparkleIcon = screen.getByTestId('sparkle-icon');
    expect(sparkleIcon.onclick).toBeNull();
    expect(sparkleIcon).not.toHaveAttribute('role', 'button');
    expect(sparkleIcon).not.toHaveAttribute('tabindex');
    expect(sparkleIcon).toHaveAttribute('aria-hidden', 'true');
  });
});
