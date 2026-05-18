import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskAddedToast } from '../components/TaskAddedToast';

describe('TaskAddedToast', () => {
  it('render test - renders the toast with success text and svg icon when visible is true and fading is false', () => {
    render(<TaskAddedToast visible={true} fading={false} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Task added successfully')).toBeInTheDocument();
    const container = screen.getByRole('status');
    expect(container).toHaveClass('opacity-100');
  });

  it('interaction test - applies opacity-0 class when visible is true and fading is true', () => {
    render(<TaskAddedToast visible={true} fading={true} />);

    const container = screen.getByRole('status');
    expect(container).toHaveClass('opacity-0');
    expect(container).not.toHaveClass('opacity-100');
  });

  it('edge case - renders nothing when visible is false', () => {
    const { container } = render(<TaskAddedToast visible={false} fading={false} />);

    expect(container.firstChild).toBeNull();
  });
});
