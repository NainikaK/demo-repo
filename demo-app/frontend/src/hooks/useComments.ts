import { useState, useCallback } from 'react';
import type { Comment } from '../types';
import { COMMENTS_URL } from '../utils/constants';
import {
  LABEL_COMMENT_FETCH_ERROR,
  LABEL_COMMENT_SAVE_ERROR,
} from '../utils/strings';

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
        throw new Error(LABEL_COMMENT_FETCH_ERROR);
      }
      const data: Comment[] = await response.json();
      setComments(data);
    } catch {
      setFetchError(LABEL_COMMENT_FETCH_ERROR);
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
          throw new Error(LABEL_COMMENT_SAVE_ERROR);
        }
        const created: Comment = await response.json();
        setComments((prev) => [...prev, created]);
        return created;
      } catch {
        return null;
      }
    },
    []
  );

  return { comments, fetchLoading, fetchError, fetchComments, postComment };
}
