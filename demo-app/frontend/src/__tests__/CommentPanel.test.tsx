import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CommentPanel } from '../components/CommentPanel';
import type { ActiveCommentTask } from '../types';

const activeTask: ActiveCommentTask = { id: 'task-1', title: 'My Task Title' };

const mockFetchComments = vi.fn();
const mockPostComment = vi.fn();

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    fetchLoading: false,
    fetchError: null,
    fetchComments: mockFetchComments,
    postComment: mockPostComment,
  }),
}));

describe('CommentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchComments.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the task title and textarea when activeTask is provided', async () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    await waitFor(() => expect(mockFetchComments).toHaveBeenCalledWith('task-1'));

    expect(screen.getByText('My Task Title')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Comment text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save comment' })).toBeInTheDocument();
  });

  it('render test - renders null when activeTask is null', () => {
    const { container } = render(
      <CommentPanel
        activeTask={null}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('interaction test - calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={onClose}
        onCommentAdded={vi.fn()}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close comments panel' });
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('interaction test - Save button is disabled when input is empty', async () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    const saveButton = screen.getByRole('button', { name: 'Save comment' });
    expect(saveButton).toBeDisabled();
  });

  it('interaction test - shows validation error when text exceeds 500 characters', async () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'Comment text' });
    const longText = 'a'.repeat(501);
    await userEvent.type(textarea, longText);

    expect(screen.getByText('Comment must not exceed 500 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save comment' })).toBeDisabled();
  });

  it('interaction test - calls postComment and onCommentAdded on successful save', async () => {
    const onCommentAdded = vi.fn();
    mockPostComment.mockResolvedValueOnce({
      id: 'c1',
      taskId: 'task-1',
      text: 'Hello',
      createdAt: '2024-01-01T00:00:00Z',
    });

    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={onCommentAdded}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'Comment text' });
    await userEvent.type(textarea, 'Hello');

    const saveButton = screen.getByRole('button', { name: 'Save comment' });
    await userEvent.click(saveButton);

    await waitFor(() => expect(onCommentAdded).toHaveBeenCalledWith('task-1'));
    expect(mockPostComment).toHaveBeenCalledWith('task-1', 'Hello');
  });

  it('interaction test - shows save error when postComment returns null', async () => {
    mockPostComment.mockResolvedValueOnce(null);

    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'Comment text' });
    await userEvent.type(textarea, 'Hello');

    const saveButton = screen.getByRole('button', { name: 'Save comment' });
    await userEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getByText('Failed to save comment. Please try again.')).toBeInTheDocument()
    );
  });

  it('edge case - calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={onClose}
        onCommentAdded={vi.fn()}
      />
    );

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('edge case - does not render when activeTask is null and overlay is not present', () => {
    render(
      <CommentPanel
        activeTask={null}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
