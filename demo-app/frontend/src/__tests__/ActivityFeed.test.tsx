import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityFeed } from '../components/ActivityFeed';
import { CommentPanel } from '../components/CommentPanel';
import type { ActivityEntry } from '../types';

const mockFetchComments = vi.fn();
const mockPostComment = vi.fn();
const mockFetchActivity = vi.fn();

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

const makeEntry = (id: string, description: string, createdAt: string): ActivityEntry => ({
  id,
  taskId: 'task-1',
  description,
  createdAt,
});

describe('ActivityFeed', () => {
  it('render test - renders a list of activity entries when entries are provided', () => {
    const entries: ActivityEntry[] = [
      makeEntry('1', 'Task created', '2024-01-10T09:00:00.000Z'),
      makeEntry('2', 'Comment added', '2024-01-11T10:00:00.000Z'),
    ];
    render(<ActivityFeed entries={entries} fetchLoading={false} fetchError={null} />);

    expect(screen.getByText('Task created')).toBeInTheDocument();
    expect(screen.getByText('Comment added')).toBeInTheDocument();
  });

  it('interaction test - renders the loading message when fetchLoading is true', () => {
    render(<ActivityFeed entries={[]} fetchLoading={true} fetchError={null} />);

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('edge case - renders the empty message when entries array is empty and not loading', () => {
    render(<ActivityFeed entries={[]} fetchLoading={false} fetchError={null} />);

    expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
  });

  it('edge case - renders the error message when fetchError is set', () => {
    render(<ActivityFeed entries={[]} fetchLoading={false} fetchError="Network error" />);

    expect(screen.getByText('Failed to load activity. Please try again.')).toBeInTheDocument();
  });

  it('edge case - error message takes precedence over empty entries', () => {
    render(<ActivityFeed entries={[]} fetchLoading={false} fetchError="Some error" />);

    expect(screen.queryByText('No activity recorded yet.')).not.toBeInTheDocument();
    expect(screen.getByText('Failed to load activity. Please try again.')).toBeInTheDocument();
  });
});

describe('CommentPanel interaction test', () => {
  it('clicking the Activity tab shows the ActivityFeed component', async () => {
    const activeTask = { id: 'task-1', title: 'My Test Task' };
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
    await act(async () => {
      fireEvent.click(activityTab);
    });

    expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
  });
});

describe('useComments fetchComments error case', () => {
  it('sets fetchError when response is not ok', async () => {
    const { useComments } = await vi.importActual<typeof import('../hooks/useComments')>('../hooks/useComments');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { renderHook } = await import('@testing-library/react');
    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task-1');
    });

    expect(result.current.fetchError).toBe('Request failed with status 500');

    vi.unstubAllGlobals();
  });
});
