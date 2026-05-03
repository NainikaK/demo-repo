import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityFeed } from '../components/ActivityFeed';
import { CommentPanel } from '../components/CommentPanel';
import type { ActivityEntry } from '../types';

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    fetchLoading: false,
    fetchError: null,
    fetchComments: vi.fn(),
    postComment: vi.fn(),
  }),
}));

vi.mock('../hooks/useActivity', () => ({
  useActivity: () => ({
    entries: [],
    fetchLoading: false,
    fetchError: null,
    fetchActivity: vi.fn(),
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
  it('clicking the Activity tab shows the ActivityFeed component', () => {
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
    fireEvent.click(activityTab);

    expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
  });
});
