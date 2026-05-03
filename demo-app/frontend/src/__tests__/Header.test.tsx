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
  PaperIcon: ({ className }: { className?: string }) => (
    <svg data-testid="paper-icon" className={className} aria-hidden="true" focusable="false" />
  ),
}));

describe('Header', () => {
  it('render test - renders the Task Manager title with a paper icon beside it', () => {
    render(<Header />);

    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.getByTestId('paper-icon')).toBeInTheDocument();
  });

  it('interaction test - calls toggleTheme when the theme toggle button is clicked', async () => {
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: /toggle to dark/i });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - the paper icon is non-interactive (has no role of button and is aria-hidden)', () => {
    render(<Header />);

    const paperIcon = screen.getByTestId('paper-icon');
    expect(paperIcon).toHaveAttribute('aria-hidden', 'true');
    expect(paperIcon).not.toHaveAttribute('role', 'button');
    expect(paperIcon).toHaveAttribute('focusable', 'false');
  });
});
