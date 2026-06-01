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
  it('render test - renders the APP_TITLE text inside an h1 element with the correct color class', () => {
    mocks.theme = 'light';
    render(<Header />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-[#AFEEEE]');
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    mocks.theme = 'light';
    mocks.toggleTheme.mockClear();
    render(<Header />);

    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders the h1 with the color class when theme is dark', () => {
    mocks.theme = 'dark';
    render(<Header />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-[#AFEEEE]');
  });
});
