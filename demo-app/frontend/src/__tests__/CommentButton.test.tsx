import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentButton } from '../components/CommentButton';

describe('CommentButton', () => {
  it('render test - renders a button with the comment count displayed', () => {
    render(<CommentButton commentCount={3} onClick={vi.fn()} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View comments (3)' })).toBeInTheDocument();
  });

  it('interaction test - calls onClick when the button is clicked', async () => {
    const onClick = vi.fn();
    render(<CommentButton commentCount={5} onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'View comments (5)' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('edge case - renders with a comment count of zero without crashing', () => {
    render(<CommentButton commentCount={0} onClick={vi.fn()} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View comments (0)' })).toBeInTheDocument();
  });
});
