import { useState, useCallback } from 'react';
import type { ActivityEntry } from '../types';
import { ACTIVITY_URL } from '../utils/constants';

export interface UseActivityResult {
  entries: ActivityEntry[];
  fetchLoading: boolean;
  fetchError: string | null;
  fetchActivity: (taskId: string) => Promise<void>;
}

export function useActivity(): UseActivityResult {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchActivity = useCallback(async (taskId: string): Promise<void> => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(ACTIVITY_URL(taskId));
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data: ActivityEntry[] = await response.json();
      setEntries(data);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Unknown error fetching activity'
      );
      setEntries([]);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  return { entries, fetchLoading, fetchError, fetchActivity };
}
