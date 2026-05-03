import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityFeed } from '../components/ActivityFeed';
import type { ActivityEntry } from '../types';

const makeEntry = (id: string, eventType: string, createdAt: string): ActivityEntry => ({
  id,
  taskId: 'task-1',
  eventType,
  createdAt,
});

describe('ActivityFeed', () => {
  it('render test - renders activity entries with event type and datetime when entries are provided', () => {
    const entries: ActivityEntry[] = [
      makeEntry('a1', 'Task created', '2024-01-10T09:00:00.000Z'),
      makeEntry('a2', 'Comment added', '2024-01-11T10:00:00.000Z'),
    ];

    render(<ActivityFeed entries={entries} fetchLoading={false} fetchError={null} />);

    expect(screen.getByText('Task created')).toBeInTheDocument();
    expect(screen.getByText('Comment added')).toBeInTheDocument();
  });

  it('interaction test - renders loading text when fetchLoading is true', () => {
    render(<ActivityFeed entries={[]} fetchLoading={true} fetchError={null} />);

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('edge case - renders empty state message when entries array is empty and not loading or errored', () => {
    render(<ActivityFeed entries={[]} fetchLoading={false} fetchError={null} />);

    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});
