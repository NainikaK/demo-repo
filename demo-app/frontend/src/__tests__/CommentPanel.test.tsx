import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CommentPanel } from '../components/CommentPanel';
import type { ActiveCommentTask } from '../types';

const activeTask: ActiveCommentTask = { id: 'task-1', title: 'My Task Title' };

const mockFetchSuccess = (comments: unknown[] = []) => {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => comments,
  });
};

const mockFetchError = () => {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status: 500,
  });
};

describe('CommentPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the task title and textarea when activeTask is provided', async () => {
    mockFetchSuccess([]);
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('My Task Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save comment' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('No comments yet.')).toBeInTheDocument()
    );
  });

  it('render test - displays existing comments fetched from the API', async () => {
    const comments = [
      { id: 'c1', taskId: 'task-1', text: 'First comment', createdAt: '2024-01-01T10:00:00.000Z' },
    ];
    mockFetchSuccess(comments);
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(screen.getByText('First comment')).toBeInTheDocument()
    );
  });

  it('render test - renders nothing when activeTask is null', () => {
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
    mockFetchSuccess([]);
    const onClose = vi.fn();
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={onClose}
        onCommentAdded={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close comments panel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('interaction test - shows validation error when input exceeds 500 characters', async () => {
    mockFetchSuccess([]);
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

    await waitFor(() =>
      expect(
        screen.getByText('Comment must not exceed 500 characters.')
      ).toBeInTheDocument()
    );
  });

  it('interaction test - Save button is disabled when input is empty', async () => {
    mockFetchSuccess([]);
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

  it('interaction test - successfully saves a comment and calls onCommentAdded', async () => {
    const existingComments: unknown[] = [];
    const newComment = { id: 'c2', taskId: 'task-1', text: 'Hello world', createdAt: '2024-06-01T12:00:00.000Z' };

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => existingComments })
      .mockResolvedValueOnce({ ok: true, json: async () => newComment });

    const onCommentAdded = vi.fn();
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={onCommentAdded}
      />
    );

    await waitFor(() =>
      expect(screen.getByText('No comments yet.')).toBeInTheDocument()
    );

    const textarea = screen.getByRole('textbox', { name: 'Comment text' });
    await userEvent.type(textarea, 'Hello world');
    await userEvent.click(screen.getByRole('button', { name: 'Save comment' }));

    await waitFor(() => expect(onCommentAdded).toHaveBeenCalledWith('task-1'));
    await waitFor(() =>
      expect(screen.getByText('Hello world')).toBeInTheDocument()
    );
  });

  it('interaction test - shows error message when save fails', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(screen.getByText('No comments yet.')).toBeInTheDocument()
    );

    const textarea = screen.getByRole('textbox', { name: 'Comment text' });
    await userEvent.type(textarea, 'A valid comment');
    await userEvent.click(screen.getByRole('button', { name: 'Save comment' }));

    await waitFor(() =>
      expect(
        screen.getByText('Failed to save comment. Please try again.')
      ).toBeInTheDocument()
    );
  });

  it('interaction test - calls onClose when Escape key is pressed', async () => {
    mockFetchSuccess([]);
    const onClose = vi.fn();
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={onClose}
        onCommentAdded={vi.fn()}
      />
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('edge case - displays fetch error message when comments fail to load', async () => {
    mockFetchError();
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByText('Failed to load comments. Please try again.')
      ).toBeInTheDocument()
    );
  });
});
