import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CommentPanel } from '../components/CommentPanel';

const mocks = vi.hoisted(() => ({
  fetchComments: vi.fn().mockResolvedValue(undefined),
  postComment: vi.fn().mockResolvedValue(null),
  fetchActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    fetchLoading: false,
    fetchError: null,
    fetchComments: mocks.fetchComments,
    postComment: mocks.postComment,
  }),
}));

vi.mock('../hooks/useActivity', () => ({
  useActivity: () => ({
    entries: [],
    fetchLoading: false,
    fetchError: null,
    fetchActivity: mocks.fetchActivity,
  }),
}));

vi.mock('./ActivityFeed', () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
}));

vi.mock('../utils/constants', () => ({
  COMMENT_MAX_LENGTH: 500,
  TAB_COMMENTS: 'comments',
  TAB_ACTIVITY: 'activity',
}));

const activeTask = { id: 'task-1', title: 'My Task' };

describe('CommentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders Comments and Activity tabs when activeTask is provided', () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Show comments tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show activity tab' })).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('interaction test - clicking the Activity tab calls fetchActivity with the task id', async () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    const activityTab = screen.getByRole('button', { name: 'Show activity tab' });
    await userEvent.click(activityTab);

    expect(mocks.fetchActivity).toHaveBeenCalledWith('task-1');
  });

  it('edge case - returns null and does not render when activeTask is null', () => {
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
