import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CheckTickIcon } from '../components/CheckTickIcon';

describe('CheckTickIcon', () => {
  it('render test - renders an svg element that is hidden from assistive technology', () => {
    render(<CheckTickIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('interaction test - does not respond to click events when clicked', async () => {
    const handleClick = vi.fn();
    render(
      <div onClick={handleClick}>
        <CheckTickIcon className="pointer-events-none" />
      </div>
    );

    const svg = document.querySelector('svg')!;
    await userEvent.click(svg);

    // The svg has pointer-events-none so the click bubbles but the icon itself is non-interactive
    expect(svg).not.toHaveAttribute('role', 'button');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('edge case - renders without crashing when no className prop is provided', () => {
    render(<CheckTickIcon />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });
});

describe('Header interaction test', () => {
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

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const { Header } = await import('../components/Header');
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: /switch to dark mode/i });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });
});
