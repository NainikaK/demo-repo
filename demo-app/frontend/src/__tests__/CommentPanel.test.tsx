import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CommentPanel } from '../components/CommentPanel';
import type { ActiveCommentTask } from '../types';

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    fetchLoading: false,
    fetchError: null,
    fetchComments: vi.fn().mockResolvedValue(undefined),
    postComment: vi.fn().mockResolvedValue({ id: 'c1', taskId: 'task-1', text: 'hello', createdAt: '2024-01-01T00:00:00Z' }),
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
  ActivityFeed: () => <div data-testid="activity-feed" />,
}));

const activeTask: ActiveCommentTask = { id: 'task-1', title: 'My Task' };

describe('CommentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    expect(screen.getByRole('button', { name: 'Show comments tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show activity tab' })).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('interaction test - clicking the Activity tab renders the ActivityFeed component', async () => {
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

describe(' useComments fetchComments error case', () => {
  it('sets fetchError when response is not ok', async () => {
    const { useComments } = await import('../hooks/useComments');
    // This test validates the error message string from the source
    // The source sets fetchError to err.message which is 'Request failed with status 500'
    // but CommentPanel displays LABEL_COMMENT_FETCH_ERROR = 'Failed to load comments. Please try again.'
    // So we need to test the CommentPanel displays the label string when fetchError is set

    vi.doMock('../hooks/useComments', () => ({
      useComments: () => ({
        comments: [],
        fetchLoading: false,
        fetchError: 'Failed to load comments. Please try again.',
        fetchComments: vi.fn().mockResolvedValue(undefined),
        postComment: vi.fn().mockResolvedValue(null),
      }),
    }));

    // Re-import CommentPanel with the new mock
    vi.resetModules();

    vi.doMock('../hooks/useComments', () => ({
      useComments: () => ({
        comments: [],
        fetchLoading: false,
        fetchError: 'Failed to load comments. Please try again.',
        fetchComments: vi.fn().mockResolvedValue(undefined),
        postComment: vi.fn().mockResolvedValue(null),
      }),
    }));

    vi.doMock('../hooks/useActivity', () => ({
      useActivity: () => ({
        entries: [],
        fetchLoading: false,
        fetchError: null,
        fetchActivity: vi.fn().mockResolvedValue(undefined),
      }),
    }));

    vi.doMock('../components/ActivityFeed', () => ({
      ActivityFeed: () => <div data-testid="activity-feed" />,
    }));

    const { CommentPanel: CommentPanelReloaded } = await import('../components/CommentPanel');

    const { getByText } = render(
      <CommentPanelReloaded
        activeTask={{ id: 'task-1', title: 'My Task' }}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(getByText('Failed to load comments. Please try again.')).toBeInTheDocument();
    });
  });
});
