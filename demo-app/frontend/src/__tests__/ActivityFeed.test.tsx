import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ActivityFeed } from '../components/ActivityFeed';
import { CommentPanel } from '../components/CommentPanel';
import type { ActivityEntry } from '../types';

const makeEntry = (id: string, description: string, createdAt: string): ActivityEntry => ({
  id,
  taskId: 'task-1',
  description,
  createdAt,
});

const mockFetchComments = vi.fn().mockResolvedValue(undefined);
const mockPostComment = vi.fn().mockResolvedValue(null);
const mockFetchActivity = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    fetchLoading: false,
    fetchError: null,
    fetchComments: mockFetchComments,
    postComment: mockPostComment,
  }),
}));

vi.mock('../hooks/useActivity', () => ({
  useActivity: () => ({
    entries: [],
    fetchLoading: false,
    fetchError: null,
    fetchActivity: mockFetchActivity,
  }),
}));

describe('ActivityFeed', () => {
  it('render test - renders a list of activity entries when entries are provided', () => {
    const entries = [
      makeEntry('1', 'Task created', '2024-01-01T09:00:00.000Z'),
      makeEntry('2', 'Comment added', '2024-01-02T10:00:00.000Z'),
    ];
    render(<ActivityFeed entries={entries} fetchLoading={false} fetchError={null} />);

    expect(screen.getByText('Task created')).toBeInTheDocument();
    expect(screen.getByText('Comment added')).toBeInTheDocument();
  });

  it('interaction test - renders loading text when fetchLoading is true', () => {
    render(<ActivityFeed entries={[]} fetchLoading={true} fetchError={null} />);

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('edge case - renders empty message when entries array is empty and not loading', () => {
    render(<ActivityFeed entries={[]} fetchLoading={false} fetchError={null} />);

    expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
  });
});

describe('CommentPanel interaction test', () => {
  it('clicking the Activity tab renders the ActivityFeed component', async () => {
    const user = userEvent.setup();
    const activeTask = { id: 'task-1', title: 'My Task' };
    const onClose = vi.fn();
    const onCommentAdded = vi.fn();

    render(
      <CommentPanel
        activeTask={activeTask}
        onClose={onClose}
        onCommentAdded={onCommentAdded}
      />
    );

    const activityTab = screen.getByRole('button', { name: 'Show activity tab' });
    await user.click(activityTab);

    expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
  });
});

describe('useComments fetchComments error case', () => {
  it('sets fetchError when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    }));

    const { renderHook } = await import('@testing-library/react');
    const { useComments: useCommentsReal } = await import('../hooks/useComments?real');

    const { result } = renderHook(() => useCommentsReal());

    await act(async () => {
      await result.current.fetchComments('task-1');
    });

    expect(result.current.fetchError).toBe('Request failed with status 500');

    vi.unstubAllGlobals();
  });
});
