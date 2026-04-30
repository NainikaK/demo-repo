import { useCallback, useState } from 'react';
import { COMPLETE_TASK_URL } from '../utils/constants';
import { LABEL_COMPLETE_ERROR } from '../utils/strings';

interface UseCompleteTaskResult {
  completeTask: (id: string) => Promise<boolean>;
  completeError: string | null;
}

export function useCompleteTask(): UseCompleteTaskResult {
  const [completeError, setCompleteError] = useState<string | null>(null);

  const completeTask = useCallback(async (id: string): Promise<boolean> => {
    setCompleteError(null);
    try {
      const response = await fetch(COMPLETE_TASK_URL(id), {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return true;
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : LABEL_COMPLETE_ERROR,
      );
      return false;
    }
  }, []);

  return { completeTask, completeError };
}
