import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../components/Header';
import { APP_TITLE, LABEL_TOGGLE_TO_DARK } from '../utils/strings';

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

const EXPECTED_TITLE_COLOR_CLASS = '[color:#AFEEEE]';

describe('Header', () => {
  it('render test - renders the APP_TITLE text inside a span with the paleTurquoise color class', () => {
    mocks.theme = 'light';
    render(<Header />);

    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan.tagName.toLowerCase()).toBe('span');
    expect(titleSpan).toHaveClass(EXPECTED_TITLE_COLOR_CLASS);
  });

  it('render test - title span does not carry indigo color classes', () => {
    mocks.theme = 'light';
    render(<Header />);

    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).not.toHaveClass('text-indigo-600');
    expect(titleSpan).not.toHaveClass('dark:text-indigo-400');
  });

  it('render test - title color class is applied in dark theme as well', () => {
    mocks.theme = 'dark';
    render(<Header />);

    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass(EXPECTED_TITLE_COLOR_CLASS);
  });

  it('interaction test - clicking the theme toggle button calls toggleTheme', async () => {
    mocks.theme = 'light';
    mocks.toggleTheme.mockClear();
    render(<Header />);

    const toggleButton = screen.getByRole('button', { name: LABEL_TOGGLE_TO_DARK });
    await userEvent.click(toggleButton);

    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('edge case - only the APP_TITLE span carries the paleTurquoise color class and no other text elements do', () => {
    mocks.theme = 'light';
    render(<Header />);

    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toHaveClass(EXPECTED_TITLE_COLOR_CLASS);

    const toggleButton = screen.getByRole('button', { name: LABEL_TOGGLE_TO_DARK });
    expect(toggleButton).not.toHaveClass(EXPECTED_TITLE_COLOR_CLASS);
  });
});
