import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentButton } from '../components/CommentButton';

describe('CommentButton', () => {
  it('render test - renders a button with the comment count and correct aria-label', () => {
    render(<CommentButton commentCount={3} onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'View comments (3)' });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('interaction test - calls onClick when the button is clicked', async () => {
    const onClick = vi.fn();
    render(<CommentButton commentCount={5} onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'View comments (5)' });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders correctly when commentCount is 0', () => {
    render(<CommentButton commentCount={0} onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'View comments (0)' });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
