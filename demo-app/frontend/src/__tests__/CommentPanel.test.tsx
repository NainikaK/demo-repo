import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CommentPanel } from '../components/CommentPanel';

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    fetchLoading: false,
    fetchError: null,
    fetchComments: vi.fn().mockResolvedValue(undefined),
    postComment: vi.fn().mockResolvedValue({ id: 'c1', taskId: 'task-1', text: 'Hello', createdAt: '2024-01-01T00:00:00Z' }),
  }),
}));

vi.mock('../hooks/useActivity', () => ({
  useActivity: () => ({
    entries: [],
    fetchLoading: false,
    fetchError: null,
    fetchActivity: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../components/ActivityFeed', () => ({
  ActivityFeed: () => React.createElement('div', { 'data-testid': 'activity-feed' }),
}));

const activeTask = { id: 'task-1', title: 'My Task' };

describe('CommentPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the panel with Comments and Activity tabs when activeTask is provided', () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('My Task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show comments tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show activity tab' })).toBeInTheDocument();
  });

  it('interaction test - clicking the Activity tab shows the activity feed', async () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    const activityTab = screen.getByRole('button', { name: 'Show activity tab' });
    await userEvent.click(activityTab);

    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('edge case - renders nothing when activeTask is null', () => {
    const { container } = render(
      <CommentPanel
        activeTask={null}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
