import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CommentPanel } from '../components/CommentPanel';
import { useComments } from '../hooks/useComments';
import type { ActiveCommentTask } from '../types';

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

vi.mock('../utils/constants', () => ({
  COMMENTS_URL: vi.fn((taskId: string) => `/api/v1/tasks/${taskId}/comments`),
  ACTIVITY_URL: vi.fn((taskId: string) => `/api/v1/tasks/${taskId}/activity`),
  COMMENT_MAX_LENGTH: 500,
  TAB_COMMENTS: 'comments',
  TAB_ACTIVITY: 'activity',
  TASKS_URL: '/api/v1/tasks',
  WEATHER_API_URL: '/api/v1/weather',
  COMPLETE_TASK_URL_TEMPLATE: '/api/v1/tasks/:id/complete',
  COMPLETE_TASK_URL: vi.fn((id: string) => `/api/v1/tasks/${id}/complete`),
  USERS_URL: '/api/v1/users',
}));

const activeTask: ActiveCommentTask = { id: 'task-1', title: 'Test Task' };

describe('CommentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('render test - renders the panel with the Comments and Activity tabs visible', () => {
    vi.mock('../hooks/useComments', () => ({
      useComments: () => ({
        comments: [],
        fetchLoading: false,
        fetchError: null,
        fetchComments: vi.fn().mockResolvedValue(undefined),
        postComment: vi.fn().mockResolvedValue({ id: 'c1', taskId: 'task-1', text: 'Hello', createdAt: '2024-01-01T00:00:00Z' }),
      }),
    }));

    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Show comments tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show activity tab' })).toBeInTheDocument();
  });

  it('interaction test - clicking the Activity tab renders the ActivityFeed', async () => {
    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={vi.fn()}
        onCommentAdded={vi.fn()}
      />
    );

    const activityTab = screen.getByRole('button', { name: 'Show activity tab' });
    await userEvent.click(activityTab);

    await waitFor(() => {
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    });
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

describe('useComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchComments error case - sets fetchError when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    );

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task-1');
    });

    expect(result.current.fetchError).toBe('Request failed with status 500');
  });
});
