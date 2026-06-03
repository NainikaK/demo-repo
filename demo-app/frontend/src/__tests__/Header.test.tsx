import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../components/Header';
import { APP_TITLE, LABEL_DARK_MODE, LABEL_LIGHT_MODE } from '../utils/strings';

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

describe('Header', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.theme = 'light';
    mocks.toggleTheme.mockReset();
  });

  it('renders the APP_TITLE text with the light pink color class', () => {
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass('text-pink-200');
  });

  it('calls toggleTheme when the theme toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const button = screen.getByText(LABEL_DARK_MODE);
    await user.click(button);
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders the title with text-pink-200 class when theme is dark', () => {
    mocks.theme = 'dark';
    render(<Header />);
    const titleSpan = screen.getByText(APP_TITLE);
    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveClass('text-pink-200');
    expect(screen.getByText(LABEL_LIGHT_MODE)).toBeInTheDocument();
  });
});
