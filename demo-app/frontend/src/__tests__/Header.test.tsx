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
  SmileyIcon: ({ className }: { className?: string }) => (
    <span data-testid="smiley-icon" className={className} />
  ),
}));

vi.mock('../components/SparkleIcon', () => ({
  SparkleIcon: ({ className }: { className?: string }) => (
    <span data-testid="sparkle-icon" className={className} />
  ),
}));

vi.mock('../components/ThemeIcon', () => ({
  ThemeIcon: () => <span data-testid="theme-icon" />,
}));

vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: () => <span data-testid="weather-widget" />,
}));

describe('Header', () => {
  it('render test - renders without crashing and displays the smiley icon to the left of the sparkle icon', () => {
    render(<Header />);

    const smileyIcon = screen.getByTestId('smiley-icon');
    const sparkleIcon = screen.getByTestId('sparkle-icon');

    expect(smileyIcon).toBeInTheDocument();
    expect(sparkleIcon).toBeInTheDocument();

    // Assert smiley comes before sparkle in the DOM
    const container = smileyIcon.parentElement!;
    const children = Array.from(container.children);
    const smileyIndex = children.indexOf(smileyIcon);
    const sparkleIndex = children.indexOf(sparkleIcon);
    expect(smileyIndex).toBeLessThan(sparkleIndex);
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    mocks.theme = 'light';
    mocks.toggleTheme.mockClear();
    render(<Header />);

    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - smiley icon has no interactive behaviour (no role button, no tabindex, no click handler)', () => {
    render(<Header />);

    const smileyIcon = screen.getByTestId('smiley-icon');
    expect(smileyIcon.tagName.toLowerCase()).not.toBe('button');
    expect(smileyIcon).not.toHaveAttribute('tabindex');
    expect(smileyIcon.onclick).toBeNull();
  });
});
