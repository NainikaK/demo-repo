import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ActivityFeed } from '../components/ActivityFeed';
import { CommentPanel } from '../components/CommentPanel';
import { renderHook, act } from '@testing-library/react';
import { useComments } from '../hooks/useComments';
import type { ActivityEntry } from '../types';

const makeEntry = (id: string, description: string, createdAt: string): ActivityEntry => ({
  id,
  taskId: 'task-1',
  description,
  createdAt,
});

describe('ActivityFeed', () => {
  it('render test - renders a list of activity entries with descriptions', () => {
    const entries: ActivityEntry[] = [
      makeEntry('1', 'Task created', '2024-01-01T10:00:00.000Z'),
      makeEntry('2', 'Comment added', '2024-01-02T11:00:00.000Z'),
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
});

describe(' CommentPanel interaction test', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clicking the Activity tab renders the ActivityFeed', async () => {
    const user = userEvent.setup();
    const activeTask = { id: 'task-1', title: 'Test Task' };
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

    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
    });
  });
});

describe(' useComments fetchComments error case', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets fetchError when response is not ok', async () => {
    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('task-1');
    });

    expect(result.current.fetchError).toBe('Request failed with status 500');
  });
});
