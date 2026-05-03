import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

import { Header } from '../components/Header';

describe('Header', () => {
  it('render test - renders the app title and the paper icon beside it', () => {
    render(<Header />);

    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.getByTestId('paper-icon')).toBeInTheDocument();
  });

  it('interaction test - calls toggleTheme when the theme toggle button is clicked', async () => {
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: /switch to dark mode/i });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - the paper icon has pointer-events-none and select-none classes making it non-interactive', () => {
    render(<Header />);

    const paperIcon = screen.getByTestId('paper-icon');
    expect(paperIcon).toHaveClass('pointer-events-none');
    expect(paperIcon).toHaveClass('select-none');
  });
});
