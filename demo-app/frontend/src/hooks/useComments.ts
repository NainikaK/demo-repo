import { useState, useCallback } from 'react';
import type { Comment } from '../types';
import { COMMENTS_URL } from '../utils/constants';

interface UseCommentsResult {
  comments: Comment[];
  fetchLoading: boolean;
  fetchError: string | null;
  fetchComments: (taskId: string) => Promise<void>;
  postComment: (taskId: string, text: string) => Promise<Comment | null>;
}

export function useComments(): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchComments = useCallback(async (taskId: string): Promise<void> => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(COMMENTS_URL(taskId));
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data: Comment[] = await response.json();
      setComments(data);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Unknown error fetching comments'
      );
      setComments([]);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const postComment = useCallback(
    async (taskId: string, text: string): Promise<Comment | null> => {
      try {
        const response = await fetch(COMMENTS_URL(taskId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const newComment: Comment = await response.json();
        setComments((prev) => [...prev, newComment]);
        return newComment;
      } catch {
        return null;
      }
    },
    []
  );

  return { comments, fetchLoading, fetchError, fetchComments, postComment };
}
