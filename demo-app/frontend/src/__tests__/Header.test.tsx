import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../components/Header';
import {
  APP_TITLE,
  LABEL_TOGGLE_TO_DARK,
  LABEL_TOGGLE_TO_LIGHT,
} from '../utils/strings';

const mocks = vi.hoisted(() => ({
  toggleTheme: vi.fn(),
  theme: 'light' as 'light' | 'dark',
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
  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.theme = 'light';
    mocks.toggleTheme.mockReset();
  });

  it('renders the APP_TITLE text wrapped in the light pink colour class', () => {
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass('text-pink-200');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggleButton = screen.getByRole('button', { name: LABEL_TOGGLE_TO_DARK });
    await user.click(toggleButton);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing when theme is dark and does not apply pink class to any element other than the title span', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toHaveClass('text-pink-200');
    const toggleButton = screen.getByRole('button', { name: LABEL_TOGGLE_TO_LIGHT });
    expect(toggleButton).not.toHaveClass('text-pink-200');
  });

  it('applies the light pink colour class regardless of theme', () => {
    mocks.theme = 'light';
    const { unmount } = render(<Header />);
    let titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toHaveClass('text-pink-200');
    unmount();

    mocks.theme = 'dark';
    render(<Header />);
    titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toHaveClass('text-pink-200');
  });
});
