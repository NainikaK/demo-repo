import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { useContext } from 'react';
import { ThemeProvider, ThemeContext } from '../context/ThemeContext';

// Helper component that consumes the context and exposes values for testing
function ThemeConsumer() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return <div data-testid="no-context">no context</div>;
  return (
    <div>
      <span data-testid="theme-value">{ctx.theme}</span>
      <button data-testid="toggle-btn" onClick={ctx.toggleTheme}>
        Toggle
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  describe('ThemeProvider', () => {
    it('ThemeProvider_DefaultRender_ProvidesLightTheme', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-value').textContent).toBe('light');
    });

    it('ThemeProvider_ToggleTheme_SwitchesToDarkMode', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await user.click(screen.getByTestId('toggle-btn'));

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    });

    it('ThemeProvider_ToggleThemeTwice_ReturnsTolightMode', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await user.click(screen.getByTestId('toggle-btn'));
      await user.click(screen.getByTestId('toggle-btn'));

      expect(screen.getByTestId('theme-value').textContent).toBe('light');
    });

    it('ThemeProvider_NoChildren_RendersWithoutCrashing', () => {
      expect(() =>
        render(<ThemeProvider>{null}</ThemeProvider>)
      ).not.toThrow();
    });

    it('ThemeProvider_MultipleChildren_AllChildrenReceiveContext', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
          <ThemeConsumer />
        </ThemeProvider>
      );

      const themeValues = screen.getAllByTestId('theme-value');
      expect(themeValues).toHaveLength(2);
      themeValues.forEach((el) => {
        expect(el.textContent).toBe('light');
      });
    });
  });

  describe('ThemeContext outside provider', () => {
    it('ThemeContext_UsedOutsideProvider_DoesNotCrash', () => {
      expect(() => render(<ThemeConsumer />)).not.toThrow();
    });
  });

  describe('Scenario_DarkModeToggle_ThemeSwitchesBetweenLightAndDark', () => {
    it('Scenario_DarkModeToggleButton_SwitchesThemeOnClick', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-value').textContent).toBe('light');

      await user.click(screen.getByTestId('toggle-btn'));

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    });
  });

  describe('Scenario_ThemePersistsOnNavigation_ThemeRemainsAfterRerender', () => {
    it('Scenario_ThemePersistsBetweenPages_ThemeIsPreservedAfterRerender', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await user.click(screen.getByTestId('toggle-btn'));
      expect(screen.getByTestId('theme-value').textContent).toBe('dark');

      // Simulate navigation by re-rendering child without remounting the provider
      rerender(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    });
  });
});
